export type MonitorApi = {
  id: string;
  user_email?: string;
  codigo_estudiante: string;
  numero_documento: string;
  full_name: string;
  proyecto_curricular: string;
  telefono: string;
  department: string;
  is_active: boolean;
  semester?: string | null;
  semester_is_active?: boolean | null;
  account_status?: "ACTIVE" | "PENDING" | "INACTIVE";
  activation_email_sent?: boolean;
  has_previous_monitoring?: boolean;
};

export type HorarioApi = {
  id: string;
  monitor: string;
  monitor_name: string;
  weekday: number;
  start_time: string;
  end_time: string;
  asignatura: string;
  grupo: string;
  docente: string;
  proyecto_curricular: string;
  location: string;
  is_active: boolean;
};

export type ExcepcionApi = {
  id: string;
  name: string;
  description: string;
  monitors: string[];
  schedules: string[];
  all_semester: boolean;
  semester: string | null;
  start_date: string;
  end_date: string;
  department: string | null;
  department_label: string | null;
  ignore_lateness: boolean;
  approve_overtime: boolean;
  is_active: boolean;
};

export type AnotacionApi = {
  id: string;
  leader: string;
  leader_name?: string;
  monitor: string;
  session: string | null;
  department: string;
  annotation_type: "missing_punch" | "virtual_hours" | "permission" | "novelty";
  description: string;
  action: "add" | "deduct" | "note";
  delta_minutes: number;
  occurred_on: string;
  created_at: string;
};

export type SesionApi = {
  id: string;
  monitor: string;
  monitor_name: string;
  work_day: string;
  actual_start: string | null;
  actual_end: string | null;
  normalized_start?: string | null;
  normalized_end?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  normal_minutes: number;
  overtime_minutes: number;
  penalty_minutes: number;
  late_minutes: number;
  lateness_excused: boolean;
  lateness_exception_name: string;
  overtime_status: "not_applicable" | "pending" | "approved" | "rejected";
  overtime_auto_approved?: boolean;
  overtime_exception_name?: string;
  overtime_review_note: string;
  overtime_reviewed_by_name?: string;
  overtime_reviewed_at?: string | null;
  overtime_rejection_penalized?: boolean;
  session_state?: string;
};

export type ConciliacionApi = {
  id: string;
  import_job: string;
  row_number: number;
  raw_full_name: string;
  raw_department: string;
  work_day: string;
  entry_at: string | null;
  exit_at: string | null;
  monitor: string | null;
  monitor_name: string;
  reconciliation_status: "pending" | "matched" | "manual_review" | "rejected";
  manual_review_reason: string;
  processed_at: string | null;
  processing_error: string;
};

export type ImportacionAsistenciaApi = {
  id: string;
  file_name: string;
  status: "pending" | "processing" | "completed" | "failed";
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  error_message: string;
  created_at: string;
};

export type HorarioCercanoInconsistenciaApi = {
  id: string;
  weekday: number;
  weekday_label: string;
  start_time: string;
  end_time: string;
  assigned_minutes: number;
  asignatura: string;
  grupo: string;
  docente: string;
  proyecto_curricular: string;
  project_label: string;
  location: string;
};

export type MarcacionCercanaInconsistenciaApi = {
  id: string;
  row_number: number;
  event_at: string | null;
  entry_at: string | null;
  exit_at: string | null;
  record_type: string;
  operation: string;
  pairing_status: string;
  pairing_status_label: string;
  paired_record: string | null;
  duplicate_of: string | null;
  pairing_reason: string;
  reconciliation_status: string;
  is_current: boolean;
};

export type EventoInconsistenciaApi = {
  id: string;
  action: string;
  action_label: string;
  note: string;
  actor: string | null;
  actor_name: string;
  created_at: string;
};

export type InconsistenciaApi = {
  id: string;
  raw_record: string;
  monitor: string | null;
  monitor_name: string;
  monitor_code: string | null;
  department: string;
  department_label: string;
  raw_full_name: string;
  raw_department: string;
  work_day: string;
  weekday: string;
  inconsistency_type: string;
  inconsistency_type_label: string;
  status: string;
  status_label: string;
  message: string;
  resolution_note: string;
  solution_annotation: string | null;
  event_at: string | null;
  pairing_status: string;
  pairing_status_label: string;
  detected_at: string | null;
  validated_at: string | null;
};

export type DetalleInconsistenciaApi = InconsistenciaApi & {
  nearby_schedules: HorarioCercanoInconsistenciaApi[];
  nearby_marks: MarcacionCercanaInconsistenciaApi[];
  work_session: {
    id: string;
    schedule: HorarioCercanoInconsistenciaApi | null;
    actual_start: string;
    actual_end: string;
    normal_minutes: number;
    overtime_minutes: number;
    penalty_minutes: number;
    late_minutes: number;
    session_state: string;
    invalidation_reason: string;
  } | null;
  events: EventoInconsistenciaApi[];
};

export type IndicadoresInconsistenciasApi = {
  pending_reconciliation: number;
  marking_errors: number;
};

export type FilaDashboardApi = {
  monitor_id: string;
  monitor_name: string;
  codigo_estudiante: string;
  normal_minutes: number;
  approved_overtime_minutes: number;
  pending_overtime_minutes: number;
  annotation_delta_minutes: number;
  penalty_minutes: number;
  remaining_minutes: number;
  late_count: number;
  memorandums_count: number;
  has_memorandum: boolean;
};

export type DashboardApi = {
  monitor_rows: FilaDashboardApi[];
  pending_overtime: Array<{ session_id: string; monitor_name: string; work_day: string; overtime_minutes: number }>;
  recent_annotations: Array<{ id: string; monitor_name: string; annotation_type: string; action: string; delta_minutes: number; occurred_on: string; description: string }>;
  notifications: Array<{ id: string; title: string; body: string; is_read: boolean }>;
};

export type ConsultaPublicaApi = {
  monitor: Pick<MonitorApi, "codigo_estudiante" | "full_name" | "department">;
  metrics: {
    normal_minutes: number;
    approved_overtime_minutes: number;
    pending_overtime_minutes: number;
    annotation_delta_minutes: number;
    total_minutes: number;
    remaining_minutes: number;
    late_count: number;
    has_memorandum: boolean;
  };
  recent_sessions: Array<Omit<SesionApi, "id" | "monitor" | "monitor_name" | "overtime_review_note">>;
};
