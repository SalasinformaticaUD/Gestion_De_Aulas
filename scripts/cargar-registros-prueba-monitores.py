"""Carga local de escenarios de asistencia para validar Gestión de Monitores."""

import os
import sys
from datetime import time

PROJECT_ROOT = r"C:\Users\ACER\Documents\GitHub\SoftwareHorasMonitores"
sys.path.insert(0, PROJECT_ROOT)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

import django

django.setup()

from apps.attendance.models import AttendanceInconsistency
from apps.attendance.services import create_import_job_from_path, import_workbook
from apps.monitors.models import Monitor
from apps.reports.models import MonitorMemorandum
from apps.schedules.models import Schedule
from apps.users.models import User
from apps.work_sessions.models import WorkSession


def main():
    schedule_specs = [
        ("Carol Stefanya Velasco Rodríguez", 0, time(8), time(12)),
        ("Carol Stefanya Velasco Rodríguez", 1, time(8), time(12)),
        ("Carol Stefanya Velasco Rodríguez", 2, time(8), time(12)),
        ("Carol Stefanya Velasco Rodríguez", 3, time(14), time(18)),
        ("Kaleth Molina Diaz", 3, time(8), time(12)),
        ("Esteban Alexander Bautista Solano", 4, time(8), time(12)),
        ("ghdfgh", 5, time(8), time(12)),
    ]
    schedules_created = 0
    for name, weekday, start_time, end_time in schedule_specs:
        monitor = Monitor.objects.get(full_name=name, is_active=True)
        _, created = Schedule.objects.get_or_create(
            monitor=monitor,
            weekday=weekday,
            start_time=start_time,
            end_time=end_time,
            defaults={
                "asignatura": "Escenario de prueba",
                "grupo": "TEST-2026-3",
                "docente": "Pruebas locales",
                "location": "Laboratorio de pruebas",
            },
        )
        schedules_created += int(created)

    admin = User.objects.filter(role="admin").first()
    if admin is None:
        raise RuntimeError("No existe un administrador local para registrar la carga de prueba.")

    file_path = r"C:\Users\ACER\Documents\Software Monitorias\outputs\registros-prueba-monitores-2026-3.xlsx"
    job = create_import_job_from_path(file_path=file_path, uploaded_by=admin)
    job = import_workbook(job)

    print({
        "job": str(job.id),
        "status": job.status,
        "total_rows": job.total_rows,
        "imported_rows": job.imported_rows,
        "failed_rows": job.failed_rows,
        "schedules_created": schedules_created,
        "sessions": WorkSession.objects.filter(raw_record__import_job=job).count(),
        "inconsistencies": AttendanceInconsistency.objects.filter(raw_record__import_job=job).count(),
        "memorandums_for_carol": MonitorMemorandum.objects.filter(monitor__full_name__icontains="Carol Stefanya").count(),
        "pending_overtime": WorkSession.objects.filter(raw_record__import_job=job, overtime_status="pending").count(),
    })


if __name__ == "__main__":
    main()
