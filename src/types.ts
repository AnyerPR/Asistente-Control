export interface InventoryAgua {
  historico: number;
  habilitado: number;
  entregado: number;
  frecuencia: 'Semanal' | 'Quincenal' | 'Mensual' | 'Personalizada';
}

export interface InventarioGeneralAgua {
  fardosDisponibles: number;
  botellonesDisponibles: number;
  actualizadoEn?: string;
  usuarioActualizacion?: string;
}

export interface EntregaHoyDetalle {
  fecha: string;
  hora: string;
  usuario: string;
  fardos: number;
  botellones: number;
  receptor?: string;
  observaciones?: string;
}

export interface DepartamentoAgua {
  id?: string;
  nombre: string;
  maxFardosMensual: number;
  maxBotellonesMensual: number;
  frecuencia: 'Semanal' | 'Quincenal' | 'Mensual' | 'Personalizada';
  entregadoFardosPeriodo: number;
  entregadoBotellonesPeriodo: number;
  fechaUltimaEntrega?: string;
  entregadoHoy?: boolean;
  entregadoHoyDetalle?: EntregaHoyDetalle;
  estado?: 'Normal' | 'Cerca del Límite' | 'Límite Alcanzado' | 'Excedido';
  // Campos de compatibilidad con versiones anteriores:
  faldos?: InventoryAgua;
  botellones?: InventoryAgua;
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

export interface ItemSalida {
  id?: string;
  items: string; // Nombre del bien/medicamento/insumo
  descripcion?: string;
  cantidad: number;
  unidad: string;
  categoriaBien?: 'Medicamentos' | 'Material médico' | 'Equipos' | 'Otros bienes';
}

export interface SalidaAlmacen {
  id?: string;
  fecha: string;
  hora: string;
  tipoSalida: 'Transferencia' | 'Préstamo' | 'Consumo Interno' | 'Urgencia' | 'Bautizo / Donación' | 'Merma / Baja';
  categoriaBien: 'Medicamentos' | 'Material médico' | 'Equipos' | 'Otros bienes';
  items: string; // Resumen o nombre del primer bien
  descripcion: string;
  cantidad: number;
  unidad: string;
  itemsList?: ItemSalida[]; // Lista completa de bienes/productos registrados en la salida
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
