import {
  ContractDetail,
  ContractStatus,
  IndustryRef,
  Location,
  ProcessDetail,
  ProcessStatus,
  Source,
} from '../../api/models';
import { INDUSTRIES, MUNICIPALITIES } from './catalog';

/**
 * Procesos y contratos de ejemplo en Cajicá, Chía, Bogotá, Medellín y otros municipios, con
 * industrias variadas. Son deterministas (PRNG con semilla) y sus fechas son relativas a `now`,
 * así siempre hay licitaciones vigentes. `isActive` viene precalculado como lo haría el backend.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Proceso SECOP II cuyo enriquecimiento responde 503 `Scraping.HostBlocked` (para e2e). */
export const BLOCKED_PROCESS_ID = 'CO1.REQ.7009999';

function prng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Place {
  code: string;
  raw: string;
  departmentRaw: string;
  entities: [string, string][];
}

const PLACES: Place[] = [
  {
    code: '25126',
    raw: 'CAJICA',
    departmentRaw: 'CUNDINAMARCA',
    entities: [
      ['Alcaldía Municipal de Cajicá', '899999465'],
      ['Empresa de Servicios Públicos de Cajicá S.A. E.S.P.', '832001512'],
    ],
  },
  {
    code: '25175',
    raw: 'CHIA',
    departmentRaw: 'CUNDINAMARCA',
    entities: [
      ['Alcaldía Municipal de Chía', '899999172'],
      ['Hospital San Antonio de Chía E.S.E.', '860015929'],
    ],
  },
  {
    code: '11001',
    raw: 'BOGOTA D.C.',
    departmentRaw: 'DISTRITO CAPITAL DE BOGOTA',
    entities: [
      ['Secretaría de Educación del Distrito', '899999061'],
      ['Instituto de Desarrollo Urbano - IDU', '899999081'],
      ['Gobernación de Cundinamarca', '899999114'],
    ],
  },
  {
    code: '05001',
    raw: 'MEDELLIN',
    departmentRaw: 'ANTIOQUIA',
    entities: [
      ['Distrito Especial de Ciencia, Tecnología e Innovación de Medellín', '890905211'],
      ['Empresas Públicas de Medellín E.S.P.', '890904996'],
    ],
  },
  {
    code: '25899',
    raw: 'ZIPAQUIRA',
    departmentRaw: 'CUNDINAMARCA',
    entities: [['Alcaldía Municipal de Zipaquirá', '899999343']],
  },
  {
    code: '05266',
    raw: 'ENVIGADO',
    departmentRaw: 'ANTIOQUIA',
    entities: [['Municipio de Envigado', '890907106']],
  },
  {
    code: '76001',
    raw: 'SANTIAGO DE CALI',
    departmentRaw: 'VALLE DEL CAUCA',
    entities: [['Distrito de Santiago de Cali', '890399011']],
  },
];

const TITLES: Record<string, string[]> = {
  software: [
    'Desarrollo e implementación de la plataforma de trámites en línea',
    'Licenciamiento y soporte del sistema de gestión documental',
    'Mantenimiento evolutivo del sistema de información financiera',
  ],
  logistica: [
    'Servicio de transporte terrestre de carga y mensajería',
    'Operación logística para la entrega de kits escolares',
  ],
  papeleria: [
    'Suministro de papelería y útiles de oficina',
    'Adquisición de elementos de papelería para las sedes educativas',
  ],
  'obra-civil': [
    'Mejoramiento de la malla vial urbana',
    'Construcción del parque recreativo del barrio Centro',
    'Mantenimiento de las instalaciones del palacio municipal',
  ],
  consultoria: [
    'Interventoría técnica, administrativa y financiera de obras viales',
    'Consultoría para la actualización del plan de ordenamiento territorial',
  ],
  salud: [
    'Suministro de medicamentos e insumos médico-quirúrgicos',
    'Prestación de servicios de salud ocupacional',
  ],
  alimentos: [
    'Suministro de refrigerios para el programa de alimentación escolar',
    'Adquisición de víveres para hogares comunitarios',
  ],
  'aseo-cafeteria': ['Servicio integral de aseo y cafetería', 'Suministro de insumos de aseo'],
  seguridad: [
    'Servicio de vigilancia y seguridad privada',
    'Instalación del sistema de videovigilancia urbana',
  ],
  educacion: ['Capacitación en competencias digitales para docentes'],
  vehiculos: ['Mantenimiento preventivo y correctivo del parque automotor'],
  comunicaciones: [
    'Servicio de conectividad a internet para sedes institucionales',
    'Estrategia de comunicaciones y divulgación institucional',
  ],
};

const MODALITIES: [string, boolean][] = [
  ['Licitación pública', true],
  ['Selección abreviada de menor cuantía', true],
  ['Mínima cuantía', true],
  ['Concurso de méritos', true],
  ['Contratación directa', false],
];

const CONTRACT_TYPES: Record<string, string> = {
  software: 'Prestación de servicios',
  logistica: 'Prestación de servicios',
  papeleria: 'Suministro',
  'obra-civil': 'Obra',
  consultoria: 'Consultoría',
  salud: 'Suministro',
  alimentos: 'Suministro',
  'aseo-cafeteria': 'Prestación de servicios',
  seguridad: 'Prestación de servicios',
  educacion: 'Prestación de servicios',
  vehiculos: 'Prestación de servicios',
  comunicaciones: 'Prestación de servicios',
};

const SUPPLIERS: [string, string, boolean][] = [
  ['Soluciones Digitales Andinas S.A.S.', '901234567', true],
  ['Ingeniería y Vías del Centro S.A.S.', '900765432', false],
  ['Papelería El Cóndor Ltda.', '830012345', true],
  ['Logística Sabana S.A.S.', '901456789', true],
  ['Consultores Asociados de Colombia S.A.S.', '900111222', false],
  ['Alimentos La Sabana S.A.S.', '901999888', true],
  ['Aseo Integral Bogotá S.A.S.', '900333444', false],
  ['Vigilancia Andina Ltda.', '860555666', false],
  ['Distribuidora Médica del Norte S.A.S.', '901777000', true],
  ['Conectividad Rural de Colombia S.A.S.', '901222333', true],
];

const PHASES: Record<ProcessStatus, string> = {
  open: 'Presentación de oferta',
  evaluation: 'Evaluación',
  awarded: 'Adjudicado',
  closed: 'Celebrado',
  cancelled: 'Cancelado',
  unknown: 'Borrador',
};

const PROCESS_STATUS_CYCLE: ProcessStatus[] = [
  'open',
  'open',
  'evaluation',
  'awarded',
  'open',
  'closed',
  'awarded',
  'cancelled',
];

function location(place: Place | null): Location {
  if (!place) {
    return {
      divipolaCode: null,
      municipalityName: null,
      departmentCode: null,
      departmentName: null,
      municipalityRaw: 'No Definido',
      departmentRaw: 'No Definido',
    };
  }
  const town = MUNICIPALITIES.find((m) => m.divipolaCode === place.code);
  return {
    divipolaCode: place.code,
    municipalityName: town?.name ?? null,
    departmentCode: town?.departmentCode ?? null,
    departmentName: town?.departmentName ?? null,
    municipalityRaw: place.raw,
    departmentRaw: place.departmentRaw,
  };
}

function industryRef(id: string): IndustryRef {
  const industry = INDUSTRIES.find((i) => i.id === id);
  return { id, name: industry?.name ?? id };
}

function iso(epochMs: number): string {
  return new Date(epochMs).toISOString();
}

function roundMoney(value: number): number {
  return Math.round(value / 1000) * 1000;
}

function processUrl(source: Source, sourceId: string): string {
  return source === 'secop2'
    ? `https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=${sourceId}`
    : `https://www.contratos.gov.co/consultas/detalleProceso.do?numConstancia=${sourceId}`;
}

interface ProcessSeed {
  industry: string;
  place: Place | null;
  status: ProcessStatus;
  modality: [string, boolean];
  source: Source;
  sourceId?: string;
  deadlineInDays: number;
  publishedDaysAgo: number;
  basePrice: number;
  extraIndustry?: string;
  titleIndex: number;
}

/**
 * Las primeras semillas fijan los casos que usan los e2e (software vigente en Cajicá, un
 * proceso bloqueado para el scraping…); el resto se genera.
 */
function processSeeds(): ProcessSeed[] {
  const pinned: ProcessSeed[] = [
    {
      industry: 'software',
      place: PLACES[0],
      status: 'open',
      modality: MODALITIES[1],
      source: 'secop2',
      deadlineInDays: 3,
      publishedDaysAgo: 9,
      basePrice: 185_000_000,
      titleIndex: 0,
    },
    {
      industry: 'software',
      place: PLACES[0],
      status: 'open',
      modality: MODALITIES[2],
      source: 'secop2',
      deadlineInDays: 12,
      publishedDaysAgo: 4,
      basePrice: 48_500_000,
      extraIndustry: 'consultoria',
      titleIndex: 1,
    },
    {
      industry: 'software',
      place: PLACES[1],
      status: 'open',
      modality: MODALITIES[0],
      source: 'secop2',
      sourceId: BLOCKED_PROCESS_ID,
      deadlineInDays: 20,
      publishedDaysAgo: 2,
      basePrice: 1_240_000_000,
      titleIndex: 2,
    },
    {
      industry: 'software',
      place: PLACES[0],
      status: 'awarded',
      modality: MODALITIES[1],
      source: 'secop2',
      deadlineInDays: -40,
      publishedDaysAgo: 70,
      basePrice: 320_000_000,
      titleIndex: 2,
    },
    {
      industry: 'software',
      place: PLACES[2],
      status: 'open',
      modality: MODALITIES[4],
      source: 'secop2',
      deadlineInDays: 6,
      publishedDaysAgo: 3,
      basePrice: 95_000_000,
      titleIndex: 0,
    },
    {
      industry: 'obra-civil',
      place: null,
      status: 'open',
      modality: MODALITIES[0],
      source: 'secop1',
      deadlineInDays: 15,
      publishedDaysAgo: 5,
      basePrice: 2_350_000_000,
      titleIndex: 0,
    },
  ];

  const random = prng(20261005);
  const industries = Object.keys(TITLES);
  const generated: ProcessSeed[] = [];
  for (let i = 0; i < 58; i++) {
    const industry = industries[i % industries.length];
    const status = PROCESS_STATUS_CYCLE[i % PROCESS_STATUS_CYCLE.length];
    const open = status === 'open';
    generated.push({
      industry,
      place: PLACES[Math.floor(random() * PLACES.length)],
      status,
      modality: MODALITIES[Math.floor(random() * MODALITIES.length)],
      source: random() < 0.8 ? 'secop2' : 'secop1',
      deadlineInDays: open ? 1 + Math.floor(random() * 25) : -Math.floor(5 + random() * 300),
      publishedDaysAgo: Math.floor(10 + random() * 340),
      basePrice: roundMoney(8_000_000 + random() * random() * 2_400_000_000),
      extraIndustry: random() < 0.15 ? 'consultoria' : undefined,
      titleIndex: Math.floor(random() * 3),
    });
  }
  return [...pinned, ...generated];
}

export function processesFixture(now = Date.now()): ProcessDetail[] {
  return processSeeds().map((seed, i) => {
    const sourceId =
      seed.sourceId ??
      (seed.source === 'secop2' ? `CO1.REQ.${7000100 + i * 137}` : `26-12-${14000 + i * 31}`);
    const titles = TITLES[seed.industry];
    const title = titles[seed.titleIndex % titles.length];
    const [entityName, entityNit] = seed.place
      ? seed.place.entities[i % seed.place.entities.length]
      : ['Departamento de Cundinamarca', '899999114'];
    const [modality, isCompetitive] = seed.modality;
    const deadline = now + seed.deadlineInDays * DAY_MS + 17 * 60 * 60 * 1000;
    const awarded = seed.status === 'awarded' || seed.status === 'closed';
    const industryIds = seed.extraIndustry ? [seed.industry, seed.extraIndustry] : [seed.industry];
    const unspsc = industryIds.map((id) =>
      (INDUSTRIES.find((x) => x.id === id)?.prefixes[0] ?? '80').padEnd(8, '1'),
    );
    const published = now - seed.publishedDaysAgo * DAY_MS;

    return {
      source: seed.source,
      sourceId,
      reference: `${modality
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()}-${String(i + 1).padStart(3, '0')}-2026`,
      title,
      description: `${title}${seed.place ? ` en ${location(seed.place).municipalityName}` : ''}, conforme al anexo técnico y al pliego de condiciones.`,
      entityName,
      entityNit,
      location: location(seed.place),
      industries: industryIds.map(industryRef),
      status: seed.status,
      phaseRaw: PHASES[seed.status],
      isActive: seed.status === 'open' && isCompetitive && !awarded && deadline > now,
      isCompetitive,
      modality,
      contractType: CONTRACT_TYPES[seed.industry] ?? 'Prestación de servicios',
      basePrice: seed.basePrice,
      publishedAt: iso(published),
      offersDeadlineAt: iso(deadline),
      awarded,
      awardedValue: awarded ? roundMoney(seed.basePrice * 0.93) : null,
      mainUnspsc: unspsc[0],
      unspscCodes: unspsc,
      url: processUrl(seed.source, sourceId),
      firstSeenAt: iso(published + 6 * 60 * 60 * 1000),
      updatedAt: iso(now - (i % 5) * DAY_MS),
      contracts: [],
      enrichment: null,
    };
  });
}

const CONTRACT_STATUS_CYCLE: ContractStatus[] = [
  'in_progress',
  'signed',
  'finished',
  'in_progress',
  'suspended',
  'finished',
  'cancelled',
];

/** Un contrato por cada proceso adjudicado o celebrado, más contratos directos. */
export function contractsFixture(processes: ProcessDetail[], now = Date.now()): ContractDetail[] {
  const random = prng(5126);
  const fromProcesses = processes.filter((p) => p.awarded);
  const direct = processes.filter((p) => !p.isCompetitive).slice(0, 12);
  return [...fromProcesses, ...direct].map((process, i) => {
    const status = CONTRACT_STATUS_CYCLE[i % CONTRACT_STATUS_CYCLE.length];
    const [supplierName, supplierNit, supplierIsSme] = SUPPLIERS[i % SUPPLIERS.length];
    const signed = Date.parse(process.offersDeadlineAt ?? process.publishedAt ?? '') + 9 * DAY_MS;
    const signedAt = Math.min(signed, now - DAY_MS);
    const value = process.awardedValue ?? roundMoney((process.basePrice ?? 0) * 0.97);
    const paidShare = status === 'finished' ? 1 : status === 'signed' ? 0 : random() * 0.8;
    const sourceId =
      process.source === 'secop2' ? `CO1.PCCNTR.${8000300 + i * 211}` : `26-12-${14000 + i}-1`;
    return {
      source: process.source,
      sourceId,
      processSourceId: process.sourceId,
      reference: `CTO-${String(i + 1).padStart(3, '0')}-2026`,
      description: process.title,
      processDescription: process.description,
      entityName: process.entityName,
      entityNit: process.entityNit,
      location: process.location,
      industries: process.industries,
      status,
      statusRaw: {
        signed: 'Firmado',
        in_progress: 'En ejecución',
        suspended: 'Suspendido',
        finished: 'Terminado',
        cancelled: 'Cancelado',
        unknown: 'Otro',
      }[status],
      modality: process.modality,
      contractType: process.contractType,
      signedAt: iso(signedAt),
      startsAt: iso(signedAt + 3 * DAY_MS),
      endsAt: iso(signedAt + (90 + Math.floor(random() * 270)) * DAY_MS),
      value,
      paidValue: roundMoney(value * paidShare),
      supplierName,
      supplierNit,
      supplierIsSme,
      mainUnspsc: process.mainUnspsc,
      unspscCodes: process.unspscCodes,
      url:
        process.source === 'secop2'
          ? `https://community.secop.gov.co/Public/Tendering/ContractDetailView/Index?UniqueIdentifier=${sourceId}`
          : process.url,
      firstSeenAt: iso(signedAt + DAY_MS),
      updatedAt: iso(now - (i % 4) * DAY_MS),
    };
  });
}
