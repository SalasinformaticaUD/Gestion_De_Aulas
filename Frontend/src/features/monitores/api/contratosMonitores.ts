export type MonitorApi = {
  id: string;
  codigo_estudiante: string;
  full_name: string;
  department: string;
  is_active: boolean;
};

export type HorarioApi = {
  id: string;
  monitor: string;
  monitor_name: string;
  weekday: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

export type ExcepcionApi = {
  id: string;
  name: string;
  description: string;
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
  normal_minutes: number;
  overtime_minutes: number;
  penalty_minutes: number;
  late_minutes: number;
  lateness_excused: boolean;
  lateness_exception_name: string;
  overtime_status: "not_applicable" | "pending" | "approved" | "rejected";
  overtime_review_note: string;
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
  reconciliation_status: "pending" | "matched" | "manual_review";
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
