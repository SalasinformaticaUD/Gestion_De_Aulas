from django.core.exceptions import ValidationError as DjangoValidationError
import logging
from rest_framework import decorators, exceptions, permissions, response, status, viewsets

from apps.common.choices import UserRoleChoices
from apps.common.permissions import IsAdminOrLeader
from apps.monitors.api.serializers import (
    MonitorAccountSerializer,
    MonitorSerializer,
    PlatformMonitorProvisionSerializer,
    SemesterResetSerializer,
)
from apps.monitors.models import Monitor
from apps.monitors.platform_client import provision_platform_user
from apps.monitors.selectors import visible_monitors_for_user
from apps.monitors.services import (
    create_monitor_with_user,
    delete_monitor_account,
    import_monitors_from_workbook,
    resend_monitor_activation,
    reset_semester_data,
    semester_reset_preview_counts,
    update_monitor_with_user,
)

logger = logging.getLogger(__name__)


class MonitorViewSet(viewsets.ModelViewSet):
    serializer_class = MonitorSerializer
    queryset = Monitor.objects.all()
    permission_classes = [IsAdminOrLeader]

    def get_queryset(self):
        return visible_monitors_for_user(self.request.user)

    def get_permissions(self):
        return [permission() for permission in self.permission_classes]

    def perform_create(self, serializer):
        if self.request.user.role != UserRoleChoices.ADMIN:
            raise permissions.PermissionDenied("Solo el administrador puede crear monitores.")
        serializer.save()

    def perform_update(self, serializer):
        if self.request.user.role != UserRoleChoices.ADMIN:
            raise permissions.PermissionDenied("Solo el administrador puede editar monitores.")
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role != UserRoleChoices.ADMIN:
            raise permissions.PermissionDenied("Solo el administrador puede eliminar monitores.")
        delete_monitor_account(monitor=instance)

    @decorators.action(detail=False, methods=["post"], url_path="provision")
    def provision(self, request):
        if request.user.role != UserRoleChoices.ADMIN:
            raise permissions.PermissionDenied("Solo el administrador puede crear monitores.")
        serializer = PlatformMonitorProvisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            external_user_id = provision_platform_user(
                full_name=data["full_name"], username=data["username"], email=data["email"]
            )
            monitor = Monitor.objects.filter(usuario_externo_id=external_user_id).first()
            if monitor is None:
                monitor = create_monitor_with_user(
                    full_name=data["full_name"],
                    codigo_estudiante=data["codigo_estudiante"],
                    email=data["email"],
                    department=data["department"],
                    numero_documento=data.get("numero_documento", ""),
                    proyecto_curricular=data.get("proyecto_curricular", ""),
                    telefono=data.get("telefono", ""),
                    actor=request.user,
                    confirm_repeating_monitor=data["confirm_repeating_monitor"],
                    usuario_externo_id=external_user_id,
                    request=request,
                    send_activation=False,
                )
        except DjangoValidationError as exc:
            raise exceptions.ValidationError(exc.messages)
        activation_email_sent = False
        try:
            activation_email_sent = resend_monitor_activation(monitor=monitor, request=request)
        except Exception:
            logger.exception("No fue posible enviar la activación para el monitor %s", monitor.pk)
        payload = MonitorSerializer(monitor).data
        payload["activation_email_sent"] = activation_email_sent
        return response.Response(payload, status=status.HTTP_201_CREATED)

    @decorators.action(detail=True, methods=["patch"], url_path="account")
    def update_account(self, request, pk=None):
        if request.user.role != UserRoleChoices.ADMIN:
            raise permissions.PermissionDenied("Solo el administrador puede editar monitores.")
        serializer = MonitorAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data.copy()
        data.pop("username", None)
        data.pop("confirm_repeating_monitor", None)
        try:
            monitor = update_monitor_with_user(
                monitor=self.get_object(), request=request, actor=request.user, **data
            )
        except DjangoValidationError as exc:
            raise exceptions.ValidationError(exc.messages)
        return response.Response(MonitorSerializer(monitor).data)

    @decorators.action(detail=True, methods=["post"], url_path="resend-activation")
    def resend_activation(self, request, pk=None):
        if request.user.role != UserRoleChoices.ADMIN:
            raise permissions.PermissionDenied("Solo el administrador puede reenviar la activación.")
        try:
            sent = resend_monitor_activation(monitor=self.get_object(), request=request)
        except DjangoValidationError as exc:
            raise exceptions.ValidationError(exc.messages)
        if not sent:
            raise exceptions.ValidationError("No fue posible preparar el correo de activación.")
        return response.Response({"detail": "Correo de activación reenviado."})

    @decorators.action(detail=False, methods=["post"], url_path="import")
    def import_workbook(self, request):
        if request.user.role != UserRoleChoices.ADMIN:
            raise permissions.PermissionDenied("Solo el administrador puede cargar monitores.")
        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            raise exceptions.ValidationError({"file": "Selecciona un archivo Excel (.xlsx)."})
        try:
            result = import_monitors_from_workbook(
                uploaded_file=uploaded_file,
                request=request,
                actor=request.user,
                confirm_repeating_monitors=str(request.data.get("confirm_repeating_monitors", "")).lower()
                in {"true", "1", "on"},
            )
        except DjangoValidationError as exc:
            raise exceptions.ValidationError(exc.messages)
        return response.Response({
            "total_rows": result.total_rows,
            "created": result.created,
            "skipped": [issue.__dict__ for issue in result.skipped],
            "errors": [issue.__dict__ for issue in result.errors],
        })

    @decorators.action(detail=False, methods=["get", "post"], url_path="new-semester")
    def new_semester(self, request):
        if request.user.role != UserRoleChoices.ADMIN:
            raise permissions.PermissionDenied("Solo el administrador puede iniciar un semestre.")
        if request.method == "GET":
            return response.Response({"preview": semester_reset_preview_counts()})
        serializer = SemesterResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = reset_semester_data(new_semester_name=serializer.validated_data["new_semester_name"])
        except DjangoValidationError as exc:
            raise exceptions.ValidationError(exc.messages)
        return response.Response({
            "archived_semester": result.archived_semester.name,
            "new_semester": result.new_semester.name,
            "affected": result.deleted_counts,
        }, status=status.HTTP_201_CREATED)
