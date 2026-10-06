import { Department, Industry, Municipality, UnresolvedLocation } from '../../api/models';

/** Los 33 departamentos DIVIPOLA (Bogotá D.C. incluido). */
export const DEPARTMENTS: Department[] = [
  { code: '05', name: 'Antioquia' },
  { code: '08', name: 'Atlántico' },
  { code: '11', name: 'Bogotá D.C.' },
  { code: '13', name: 'Bolívar' },
  { code: '15', name: 'Boyacá' },
  { code: '17', name: 'Caldas' },
  { code: '18', name: 'Caquetá' },
  { code: '19', name: 'Cauca' },
  { code: '20', name: 'Cesar' },
  { code: '23', name: 'Córdoba' },
  { code: '25', name: 'Cundinamarca' },
  { code: '27', name: 'Chocó' },
  { code: '41', name: 'Huila' },
  { code: '44', name: 'La Guajira' },
  { code: '47', name: 'Magdalena' },
  { code: '50', name: 'Meta' },
  { code: '52', name: 'Nariño' },
  { code: '54', name: 'Norte de Santander' },
  { code: '63', name: 'Quindío' },
  { code: '66', name: 'Risaralda' },
  { code: '68', name: 'Santander' },
  { code: '70', name: 'Sucre' },
  { code: '73', name: 'Tolima' },
  { code: '76', name: 'Valle del Cauca' },
  { code: '81', name: 'Arauca' },
  { code: '85', name: 'Casanare' },
  { code: '86', name: 'Putumayo' },
  { code: '88', name: 'Archipiélago de San Andrés, Providencia y Santa Catalina' },
  { code: '91', name: 'Amazonas' },
  { code: '94', name: 'Guainía' },
  { code: '95', name: 'Guaviare' },
  { code: '97', name: 'Vaupés' },
  { code: '99', name: 'Vichada' },
];

function municipality(divipolaCode: string, name: string): Municipality {
  const departmentCode = divipolaCode.slice(0, 2);
  const departmentName = DEPARTMENTS.find((d) => d.code === departmentCode)?.name ?? '';
  return { divipolaCode, name, departmentCode, departmentName };
}

export const MUNICIPALITIES: Municipality[] = [
  municipality('05001', 'Medellín'),
  municipality('05088', 'Bello'),
  municipality('05266', 'Envigado'),
  municipality('05360', 'Itagüí'),
  municipality('05615', 'Rionegro'),
  municipality('08001', 'Barranquilla'),
  municipality('11001', 'Bogotá D.C.'),
  municipality('13001', 'Cartagena de Indias'),
  municipality('15001', 'Tunja'),
  municipality('25126', 'Cajicá'),
  municipality('25175', 'Chía'),
  municipality('25214', 'Cota'),
  municipality('25269', 'Facatativá'),
  municipality('25307', 'Girardot'),
  municipality('25473', 'Mosquera'),
  municipality('25754', 'Soacha'),
  municipality('25899', 'Zipaquirá'),
  municipality('68001', 'Bucaramanga'),
  municipality('76001', 'Cali'),
];

export const INDUSTRIES: Industry[] = [
  {
    id: 'software',
    name: 'Desarrollo de Software',
    description: 'Desarrollo, licenciamiento y soporte de software.',
    prefixes: ['4323', '8111'],
  },
  {
    id: 'logistica',
    name: 'Logística y transporte',
    description: 'Transporte de carga, mensajería y almacenamiento.',
    prefixes: ['78'],
  },
  {
    id: 'papeleria',
    name: 'Papelería',
    description: 'Papelería, útiles y suministros de oficina.',
    prefixes: ['14', '44'],
  },
  {
    id: 'obra-civil',
    name: 'Obra civil',
    description: 'Construcción, mantenimiento de vías y edificaciones.',
    prefixes: ['72', '30'],
  },
  {
    id: 'consultoria',
    name: 'Consultoría',
    description: 'Consultoría, interventoría y estudios.',
    prefixes: ['80', '8110'],
  },
  {
    id: 'salud',
    name: 'Salud',
    description: 'Servicios médicos, medicamentos y equipos.',
    prefixes: ['42', '51', '85'],
  },
  {
    id: 'alimentos',
    name: 'Alimentos',
    description: 'Alimentación escolar, refrigerios y víveres.',
    prefixes: ['50', '9015'],
  },
  {
    id: 'aseo-cafeteria',
    name: 'Aseo y cafetería',
    description: 'Servicios de aseo, cafetería e insumos.',
    prefixes: ['47', '7611'],
  },
  {
    id: 'seguridad',
    name: 'Seguridad y vigilancia',
    description: 'Vigilancia privada y sistemas de seguridad.',
    prefixes: ['9212', '4617'],
  },
  {
    id: 'educacion',
    name: 'Educación',
    description: 'Formación, capacitación y material educativo.',
    prefixes: ['86', '60'],
  },
  {
    id: 'vehiculos',
    name: 'Vehículos',
    description: 'Compra, alquiler y mantenimiento de vehículos.',
    prefixes: ['25', '7818'],
  },
  {
    id: 'comunicaciones',
    name: 'Comunicaciones',
    description: 'Telecomunicaciones, conectividad y publicidad.',
    prefixes: ['43', '82'],
  },
  {
    id: 'otros',
    name: 'Otros',
    description: 'Bienes y servicios sin una industria asignada.',
    prefixes: [],
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function unresolvedLocationsFixture(now = Date.now()): UnresolvedLocation[] {
  const rows: [string, string, number, number][] = [
    ['CUNDINAMARCA', 'CAJICA - CUND.', 214, 90],
    ['DISTRITO CAPITAL', 'BOGOTA DC', 187, 120],
    ['ANTIOQUIA', 'MEDELLIN (ANT)', 96, 60],
    ['VALLE', 'SANTIAGO DE CALI', 71, 45],
    ['CUNDINAMARCA', 'CHIA CUNDINAMARCA', 54, 30],
    ['No Definido', 'No Definido', 33, 200],
    ['SANTANDER', 'B/MANGA', 18, 14],
  ];
  return rows.map(([departmentRaw, municipalityRaw, occurrences, ageDays]) => ({
    departmentRaw,
    municipalityRaw,
    occurrences,
    firstSeenAt: new Date(now - ageDays * DAY_MS).toISOString(),
    lastSeenAt: new Date(now - Math.min(ageDays, 3) * DAY_MS).toISOString(),
  }));
}
