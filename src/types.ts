export interface InventoryAgua {
  historico: number;
  habilitado: number;
  entregado: number;
  frecuencia: 'Semanal' | 'Quincenal' | 'Mensual';
}

export interface DepartamentoAgua {
  id?: string;
  nombre: string;
  faldos: InventoryAgua;
  botellones: InventoryAgua;
  actualizadoEn?: string;
}

export interface HistorialAgua {
  id?: string;
  idConsecutivo: number;
  fecha: string;
  hora: string;
  departamento: string;
  producto: string;
  cantidad: number;
  habilitado: number;
  frecuencia: string;
  cuota: string;
  pendiente: number;
  responsable: string;
  receptor: string;
  creadoEn?: string;
}

export interface Destinatario {
  id?: string;
  nombre: string;
  cargo: string;
  dependencia?: string;
  activo: boolean;
}

export interface ItemDespacho {
  id: string;
  nombre: string;
  cantidad: number;
  unidad?: string;
  precioUnitario?: number;
}

export interface DespachoGlobal {
  id?: string;
  numeroDespacho: string;
  paciente: string;
  departamento: string;
  fecha: string;
  hora: string;
  estado: 'Pendiente' | 'Completado' | 'En Proceso';
  responsable: string;
  medicamentos: ItemDespacho[];
  totales: number;
  observaciones?: string;
  creadoEn?: string;
}

export interface SalidaAlmacen {
  id?: string;
  fecha: string;
  hora: string;
  tipoSalida: 'Transferencia' | 'Préstamo' | 'Consumo Interno' | 'Urgencia' | 'Bautizo / Donación' | 'Merma / Baja';
  categoriaBien: 'Medicamentos' | 'Material médico' | 'Equipos' | 'Otros bienes';
  items: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  personaRecibe: string;
  personaEntrega: string;
  departamentoSolicitante: string;
  observaciones?: string;
  usuarioRegistro: string;
  creadoEn?: string;
}

export interface ItemEntrada {
  producto: string;
  descripcion: string;
  cantidad: number;
}

export interface EntradaMercancia {
  id?: string;
  proveedor: string;
  documento: string;
  destino: string;
  observaciones?: string;
  items: ItemEntrada[];
  fecha: string;
  hora: string;
  creadoEn?: string;
}

export interface Usuario {
  id: string;
  usuario: string;
  nombreMostrar: string;
  rol: string;
}

export interface ExportDestinoData {
  nombre: string;
  cargo: string;
  dependencia?: string;
  emisor?: string;
}

export interface OficioCorrespondenciaData {
  tipo: 'Informes' | 'Solicitud' | 'Certificación' | string;
  asunto: string;
  cuerpo?: string;
  solicitudArticulo?: string;
  solicitudCantidad?: number;
  usuarioNombre: string;
}
