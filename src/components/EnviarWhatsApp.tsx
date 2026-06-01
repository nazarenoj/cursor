import { useEffect, useMemo, useState } from 'react';
import { useClubConfig } from '../contexts/ClubConfigContext';
import { useLiquidaciones } from '../hooks/useLiquidaciones';
import { useSociosCompletos } from '../hooks/useSociosCompletos';
import { useCategorias } from '../hooks/useCategorias';
import { apiService } from '../services/api';
import type { Socio, WhatsAppBaileysBatchItem } from '../types';
import {
  liquidacionCuotasToPdfBase64,
  type CuotaConMesYFecha,
} from '../utils/exportLiquidacionesPdf';
import { fileToBase64 } from '../utils/whatsappEnvio';
import { useWhatsAppBaileysStatus } from '../hooks/useWhatsAppBaileysStatus';
import { WhatsAppServicioEstadoUI, WhatsAppServicioQrEnModal } from './WhatsAppServicioEstadoUI';
import './EnviarWhatsApp.css';

/** Tipos de envío: liquidaciones (cuotas), cumpleaños, al día, datos faltantes, genérico */
export type TipoMensaje = 'liquidaciones' | 'cumpleaños' | 'al_dia' | 'datos_faltantes' | 'generico';

interface EnviarWhatsAppProps {
  liquidacionMensualId?: number;
  onVolver?: () => void;
  /** Socios preseleccionados (ej. desde Lista Socios). Si se pasa sin tipoInicial, el tipo inicial será "generico". */
  sociosPreseleccionados?: Socio[];
  /** Si true, los socios preseleccionados son el único destinatario posible (sin checkboxes ni seleccionar/deseleccionar). */
  sociosFijos?: boolean;
  /** Tipo de mensaje inicial. Por defecto "liquidaciones" (o "generico" si hay sociosPreseleccionados). */
  tipoInicial?: TipoMensaje;
}

const CAMPOS_DATOS_FALTANTES: { key: keyof Socio; label: string }[] = [
  { key: 'telefono', label: 'Teléfono' },
  { key: 'email', label: 'Email' },
  { key: 'dni', label: 'DNI' },
  { key: 'calle', label: 'Calle' },
  { key: 'numeroCasa', label: 'Número' },
  { key: 'localidad', label: 'Localidad' },
  { key: 'codigoPostal', label: 'Código postal' },
];

export const EnviarWhatsApp = ({ liquidacionMensualId, onVolver, sociosPreseleccionados, sociosFijos = false, tipoInicial }: EnviarWhatsAppProps) => {
  const { nombreClub, whatsappUsarServicio } = useClubConfig();
  const modoServicioBaileys = whatsappUsarServicio !== false;
  const { status: baileysStatus, refrescar: refrescarBaileys } = useWhatsAppBaileysStatus(modoServicioBaileys);
  const { liquidacionesCuotas, liquidacionesMensuales } = useLiquidaciones();
  const { data: socios = [] } = useSociosCompletos();
  const { categorias } = useCategorias();

  const tipoInicialResuelto: TipoMensaje =
    tipoInicial ?? (sociosPreseleccionados?.length ? 'generico' : 'liquidaciones');

  const [tipoMensaje, setTipoMensaje] = useState<TipoMensaje>(tipoInicialResuelto);
  const [cuotasSeleccionadas, setCuotasSeleccionadas] = useState<Set<number>>(new Set());
  const [sociosSeleccionados, setSociosSeleccionados] = useState<Set<number>>(new Set());
  const [soloPendientes, setSoloPendientes] = useState(true);
  const STORAGE_KEY_SELECTED = 'whatsapp_plantilla_liquidaciones_seleccion_v1';

  // Orden: siempre más reciente → más viejo (mes desc). Ver plan "Mensajes a socios y liquidaciones".
  const cuotasDisponibles = useMemo(() => {
    let cuotas = liquidacionesCuotas;

    if (liquidacionMensualId) {
      cuotas = cuotas.filter((c) => c.liquidacionMensualId === liquidacionMensualId);
    }

    // Cuando los socios están fijos (llamada individual), solo mostramos las cuotas de ese/esos socio/s
    if (sociosFijos && sociosPreseleccionados?.length) {
      const ids = new Set(sociosPreseleccionados.map((s) => s.id));
      cuotas = cuotas.filter((c) => ids.has(c.socioId));
    }

    if (soloPendientes) {
      cuotas = cuotas.filter((c) => !c.pagado);
    }

    const conInfo = cuotas.map((cuota) => {
      const liquidacionMensual = liquidacionesMensuales.find(
        (lm) => lm.id === cuota.liquidacionMensualId,
      );
      const socio = socios.find((s) => s.id === cuota.socioId);
      return {
        ...cuota,
        mes: liquidacionMensual?.mes || '',
        telefono: socio?.telefono || '',
        fechaLiquidacion: liquidacionMensual?.fechaLiquidacion || '',
      };
    });

    // Orden explícito: más reciente primero (mes descendente)
    return [...conInfo].sort((a, b) => (b.mes || '').localeCompare(a.mes || ''));
  }, [liquidacionesCuotas, liquidacionesMensuales, socios, liquidacionMensualId, soloPendientes, sociosFijos, sociosPreseleccionados]);

  type CuotaDisponible = (typeof cuotasDisponibles)[number];

  // Socios activos (sin fecha de baja)
  const sociosActivos = useMemo(
    () => socios.filter((s) => !s.fechaBaja || s.fechaBaja === ''),
    [socios],
  );

  // Cumpleaños: mes actual, con teléfono. Orden: más reciente por día del mes (opcional: por numeroSocio)
  const sociosCumpleaños = useMemo(() => {
    const mesActual = new Date().getMonth() + 1;
    return sociosActivos.filter((s) => {
      if (!s.telefono || !s.fechaNacimiento) return false;
      const [, mes] = (s.fechaNacimiento as string).split('-').map(Number);
      return mes === mesActual;
    }).sort((a, b) => a.numeroSocio - b.numeroSocio);
  }, [sociosActivos]);

  // Al día: tienen al menos una cuota y cero impagas
  const sociosAlDia = useMemo(() => {
    const cuotasPorSocio = new Map<number, { total: number; impagas: number }>();
    for (const c of liquidacionesCuotas) {
      const prev = cuotasPorSocio.get(c.socioId) || { total: 0, impagas: 0 };
      prev.total += 1;
      if (!c.pagado) prev.impagas += 1;
      cuotasPorSocio.set(c.socioId, prev);
    }
    return sociosActivos.filter((s) => {
      if (!s.telefono) return false;
      const info = cuotasPorSocio.get(s.id);
      if (!info || info.total === 0) return false;
      return info.impagas === 0;
    }).sort((a, b) => b.numeroSocio - a.numeroSocio);
  }, [sociosActivos, liquidacionesCuotas]);

  // Datos faltantes: al menos un campo vacío
  const sociosDatosFaltantes = useMemo(() => {
    return sociosActivos.filter((s) => {
      for (const { key } of CAMPOS_DATOS_FALTANTES) {
        const val = s[key];
        if (val === undefined || val === null || String(val).trim() === '') return true;
      }
      return false;
    }).map((s) => {
      const faltantes: string[] = [];
      for (const { key, label } of CAMPOS_DATOS_FALTANTES) {
        const val = s[key];
        if (val === undefined || val === null || String(val).trim() === '') faltantes.push(label);
      }
      return { socio: s, datosFaltantes: faltantes.join(', ') };
    }).sort((a, b) => a.socio.numeroSocio - b.socio.numeroSocio);
  }, [sociosActivos]);

  // Genérico: preseleccionados o todos los activos con teléfono
  const sociosGenerico = useMemo(() => {
    const base = sociosPreseleccionados?.length
      ? sociosPreseleccionados.filter((s) => !s.fechaBaja || s.fechaBaja === '')
      : sociosActivos;
    return base.filter((s) => s.telefono).sort((a, b) => b.numeroSocio - a.numeroSocio);
  }, [sociosActivos, sociosPreseleccionados]);

  const getPlantillaPorDefecto = (tipo: TipoMensaje) => {
    switch (tipo) {
      case 'liquidaciones':
        return (
          `Hola {nombre} {apellido}!\n\n` +
          `Te recordamos que tenés pendiente el pago de la(s) cuota(s):\n` +
          `{detalleCuotas}\n\n` +
          `Total: $${'{monto}'}\n\n` +
          `📋 Socio N°: {numeroSocio} | Categoría: {categoria}\n\n` +
          `Por favor, acercate a realizar el pago.\n\n` +
          `Saludos cordiales,\n${nombreClub}`
        );
      case 'cumpleaños':
        return `Hola {nombre} {apellido}!\n\n¡Te deseamos un muy feliz cumpleaños de parte de ${nombreClub}!\n\nQue tengas un excelente día.\n\nSaludos cordiales.`;
      case 'al_dia':
        return `Hola {nombre} {apellido}!\n\nTe informamos que tu situación de cuotas está al día. ¡Gracias por tu compromiso con ${nombreClub}!\n\nSaludos cordiales.`;
      case 'datos_faltantes':
        return `Hola {nombre} {apellido}!\n\nTe contactamos para pedirte que completes los siguientes datos en tu ficha de socio: {datosFaltantes}.\n\nEs importante para mantener nuestra base actualizada.\n\nSaludos cordiales,\n${nombreClub}`;
      case 'generico':
      default:
        return `Hola {nombre} {apellido}!\n\nTe saludamos desde ${nombreClub}.\n\nSaludos cordiales.`;
    }
  };

  const plantillaPorDefecto = () => getPlantillaPorDefecto(tipoMensaje);

  type PlantillaWhatsApp = { id: number; nombre: string; texto: string };

  /** Valor unificado: "tipo:xxx" o "plantilla:id". Un solo selector para tipo y plantillas guardadas. */
  const [seleccionTipoOPlantilla, setSeleccionTipoOPlantilla] = useState<string>(
    `tipo:${tipoInicialResuelto}`,
  );
  const [plantillas, setPlantillas] = useState<PlantillaWhatsApp[]>([]);
  const [plantillaSeleccionadaId, setPlantillaSeleccionadaId] = useState<number | ''>('');
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');
  const [archivoPdfAdjunto, setArchivoPdfAdjunto] = useState('');
  const [enviandoBaileys, setEnviandoBaileys] = useState(false);
  const [pdfAdjuntoIndividual, setPdfAdjuntoIndividual] = useState<File | null>(null);
  const [pdfMasivoOpcional, setPdfMasivoOpcional] = useState<File | null>(null);

  const esTipo = seleccionTipoOPlantilla.startsWith('tipo:');

  const cargarPlantillas = async () => {
    const list = await apiService.getWhatsAppTemplates();
    setPlantillas(list.map((t) => ({ id: t.id, nombre: t.nombre, texto: t.texto })));
    return list;
  };

  const getCategoriaNombre = (categoriaId: number) =>
    categorias.find((c) => c.id === categoriaId)?.nombre ?? '';

  const handleCambioTipoOPlantilla = (valor: string) => {
    setSeleccionTipoOPlantilla(valor);
    if (valor.startsWith('tipo:')) {
      const tipo = valor.slice(5) as TipoMensaje;
      setTipoMensaje(tipo);
      setMensajePersonalizado(getPlantillaPorDefecto(tipo));
      setPlantillaSeleccionadaId('');
      setCuotasSeleccionadas(new Set());
      setSociosSeleccionados(new Set());
      localStorage.removeItem(STORAGE_KEY_SELECTED);
    } else if (valor.startsWith('plantilla:')) {
      const id = Number(valor.slice(9));
      if (Number.isFinite(id)) {
        const p = plantillas.find((x) => x.id === id);
        if (p) {
          setPlantillaSeleccionadaId(id);
          setMensajePersonalizado(p.texto);
          localStorage.setItem(STORAGE_KEY_SELECTED, String(id));
        }
      }
    }
  };

  // Cargar plantillas y restaurar selección (tipo o plantilla) desde localStorage
  useEffect(() => {
    (async () => {
      try {
        const list = await cargarPlantillas();
        const selectedRaw = localStorage.getItem(STORAGE_KEY_SELECTED);
        const selectedId = selectedRaw ? Number(selectedRaw) : NaN;
        const tienePlantillaGuardada = Number.isFinite(selectedId) && list.some((t) => t.id === selectedId);

        // Si se recibió un tipoInicial explícito (ej. 'liquidaciones' desde acción individual), ignorar localStorage
        if (tipoInicial) {
          setSeleccionTipoOPlantilla(`tipo:${tipoInicial}`);
          setTipoMensaje(tipoInicial);
          setPlantillaSeleccionadaId('');
          setMensajePersonalizado(getPlantillaPorDefecto(tipoInicial));
        } else if (tienePlantillaGuardada && selectedId && !sociosPreseleccionados?.length) {
          const p = list.find((t) => t.id === selectedId)!;
          setSeleccionTipoOPlantilla(`plantilla:${selectedId}`);
          setTipoMensaje('generico');
          setPlantillaSeleccionadaId(selectedId);
          setMensajePersonalizado(p.texto);
        } else if (sociosPreseleccionados?.length) {
          setSeleccionTipoOPlantilla('tipo:generico');
          setTipoMensaje('generico');
          setPlantillaSeleccionadaId('');
          setMensajePersonalizado(getPlantillaPorDefecto('generico'));
        } else {
          setSeleccionTipoOPlantilla('tipo:liquidaciones');
          setTipoMensaje('liquidaciones');
          setPlantillaSeleccionadaId('');
          setMensajePersonalizado(getPlantillaPorDefecto('liquidaciones'));
        }
      } catch (e) {
        setPlantillas([]);
        setSeleccionTipoOPlantilla(`tipo:${tipoInicialResuelto}`);
        setTipoMensaje(tipoInicialResuelto);
        setPlantillaSeleccionadaId('');
        setMensajePersonalizado(getPlantillaPorDefecto(tipoInicialResuelto));
      }
    })();
  }, []);

  const guardarComoNueva = async () => {
    const nombre = window.prompt('Nombre para la nueva plantilla:', `Plantilla ${plantillas.length + 1}`);
    if (!nombre) return;
    try {
      const creada = await apiService.crearWhatsAppTemplate({ nombre: nombre.trim(), texto: mensajePersonalizado });
      await cargarPlantillas();
      setSeleccionTipoOPlantilla(`plantilla:${creada.id}`);
      setPlantillaSeleccionadaId(creada.id);
      setMensajePersonalizado(creada.texto);
      localStorage.setItem(STORAGE_KEY_SELECTED, String(creada.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo guardar la plantilla');
    }
  };

  const actualizarPlantilla = async () => {
    if (!plantillaSeleccionadaId || esTipo) return;
    const p = plantillas.find((x) => x.id === plantillaSeleccionadaId);
    if (!p) return;
    try {
      await apiService.actualizarWhatsAppTemplate(plantillaSeleccionadaId, { nombre: p.nombre, texto: mensajePersonalizado });
      await cargarPlantillas();
      alert('Plantilla actualizada.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo actualizar la plantilla');
    }
  };

  const eliminarPlantilla = async () => {
    if (!plantillaSeleccionadaId || esTipo) return;
    const p = plantillas.find((x) => x.id === plantillaSeleccionadaId);
    if (!p) return;
    if (!window.confirm(`¿Eliminar la plantilla "${p.nombre}"?`)) return;
    try {
      await apiService.eliminarWhatsAppTemplate(plantillaSeleccionadaId);
      await cargarPlantillas();
      setSeleccionTipoOPlantilla('tipo:generico');
      setTipoMensaje('generico');
      setPlantillaSeleccionadaId('');
      setMensajePersonalizado(getPlantillaPorDefecto('generico'));
      localStorage.removeItem(STORAGE_KEY_SELECTED);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo eliminar la plantilla');
    }
  };

  // Modal individual (cuota o socio según tipo)
  const [mostrarModalMensaje, setMostrarModalMensaje] = useState(false);
  const [mensajeParaEnviar, setMensajeParaEnviar] = useState('');
  const [cuotaParaEnviar, setCuotaParaEnviar] = useState<CuotaDisponible | null>(null);
  const [socioParaEnviar, setSocioParaEnviar] = useState<{ socio: Socio; datosFaltantes?: string } | null>(null);

  // Modal masivo (cuotas o socios)
  const [mostrarModalMasivo, setMostrarModalMasivo] = useState(false);
  const [plantillaMasiva, setPlantillaMasiva] = useState('');
  const [cuotasMasivas, setCuotasMasivas] = useState<CuotaDisponible[]>([]);
  const [cuotaPreviewMasiva, setCuotaPreviewMasiva] = useState<CuotaDisponible | null>(null);
  const [sociosMasivos, setSociosMasivos] = useState<{ socio: Socio; datosFaltantes?: string; cuotas?: CuotaDisponible[] }[]>([]);
  const [socioPreviewMasivo, setSocioPreviewMasivo] = useState<{ socio: Socio; datosFaltantes?: string; cuotas?: CuotaDisponible[] } | null>(null);

  // Generar mensaje para una cuota
  const generarMensaje = (cuota: CuotaDisponible): string => {
    const nombreMes = getNombreMes(cuota.mes);
    
    if (mensajePersonalizado.trim()) {
      const detalleCuotas = `• ${nombreMes}: $${cuota.monto.toFixed(2)}`;
      return mensajePersonalizado
        .replace(/{nombre}/g, cuota.nombre)
        .replace(/{apellido}/g, cuota.apellido)
        .replace(/{numeroSocio}/g, cuota.numeroSocio.toString())
        .replace(/{categoria}/g, cuota.categoriaNombre)
        .replace(/{mes}/g, nombreMes)
        .replace(/{monto}/g, cuota.monto.toFixed(2))
        .replace(/{detalleCuotas}/g, detalleCuotas);
    }
    
    const mensajeBase = 
      `Hola ${cuota.nombre} ${cuota.apellido}!\n\n` +
      `Te recordamos que tenés pendiente el pago de la cuota correspondiente a ${nombreMes}.\n\n` +
      `📋 Detalle:\n` +
      `• Socio N°: ${cuota.numeroSocio}\n` +
      `• Categoría: ${cuota.categoriaNombre}\n` +
      `• Mes: ${nombreMes}\n` +
      `• Monto: $${cuota.monto.toFixed(2)}\n\n` +
      `Por favor, acercate a realizar el pago.\n\n` +
      `Saludos cordiales,\n${nombreClub}`;

    return mensajeBase;
  };

  const aplicarPlantilla = (plantilla: string, cuota: CuotaDisponible): string => {
    const nombreMes = getNombreMes(cuota.mes);
    const detalleCuotas = `• ${nombreMes}: $${cuota.monto.toFixed(2)}`;
    return plantilla
      .replace(/{nombre}/g, cuota.nombre)
      .replace(/{apellido}/g, cuota.apellido)
      .replace(/{numeroSocio}/g, cuota.numeroSocio.toString())
      .replace(/{categoria}/g, cuota.categoriaNombre)
      .replace(/{mes}/g, nombreMes)
      .replace(/{monto}/g, cuota.monto.toFixed(2))
      .replace(/{detalleCuotas}/g, detalleCuotas);
  };

  /** Aplica la plantilla para un socio con varias cuotas (un solo mensaje con todas). */
  const aplicarPlantillaMultiCuota = (
    plantilla: string,
    socio: Socio,
    cuotas: CuotaDisponible[],
  ): string => {
    const cat = getCategoriaNombre(socio.categoriaId);
    const detalleCuotas = cuotas
      .map((c) => `• ${getNombreMes(c.mes)}: $${c.monto.toFixed(2)}`)
      .join('\n');
    const total = cuotas.reduce((s, c) => s + c.monto, 0);
    const primerMes = cuotas[0] ? getNombreMes(cuotas[0].mes) : '';
    return plantilla
      .replace(/{nombre}/g, socio.nombre || '')
      .replace(/{apellido}/g, socio.apellido || '')
      .replace(/{numeroSocio}/g, String(socio.numeroSocio))
      .replace(/{categoria}/g, cat)
      .replace(/{mes}/g, primerMes)
      .replace(/{monto}/g, total.toFixed(2))
      .replace(/{detalleCuotas}/g, detalleCuotas);
  };

  const aplicarPlantillaSocio = (
    plantilla: string,
    socio: Socio,
    datosFaltantes?: string,
  ): string => {
    const cat = getCategoriaNombre(socio.categoriaId);
    return plantilla
      .replace(/{nombre}/g, socio.nombre || '')
      .replace(/{apellido}/g, socio.apellido || '')
      .replace(/{numeroSocio}/g, String(socio.numeroSocio))
      .replace(/{categoria}/g, cat)
      .replace(/{datosFaltantes}/g, datosFaltantes ?? '')
      .replace(/{email}/g, socio.email || '')
      .replace(/{telefono}/g, socio.telefono || '');
  };

  const getNombreMes = (mesString: string): string => {
    if (!mesString) return '';
    const [año, mes] = mesString.split('-');
    const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
    return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  };

  const getDatosFaltantesForSocio = (s: Socio): string => {
    const faltantes: string[] = [];
    for (const { key, label } of CAMPOS_DATOS_FALTANTES) {
      const val = s[key];
      if (val === undefined || val === null || String(val).trim() === '') faltantes.push(label);
    }
    return faltantes.join(', ');
  };

  // Lista unificada de destinatarios por tipo (socios). Si sociosFijos, solo los preseleccionados.
  const listaSociosDestinatarios = useMemo((): { socio: Socio; datosFaltantes?: string }[] => {
    if (sociosFijos && sociosPreseleccionados?.length) {
      return sociosPreseleccionados.map((s) => ({
        socio: s,
        datosFaltantes: tipoMensaje === 'datos_faltantes' ? getDatosFaltantesForSocio(s) : undefined,
      }));
    }
    switch (tipoMensaje) {
      case 'cumpleaños':
        return sociosCumpleaños.map((s) => ({ socio: s }));
      case 'al_dia':
        return sociosAlDia.map((s) => ({ socio: s }));
      case 'datos_faltantes':
        return sociosDatosFaltantes;
      case 'generico':
        return sociosGenerico.map((s) => ({ socio: s }));
      default:
        return [];
    }
  }, [tipoMensaje, sociosCumpleaños, sociosAlDia, sociosDatosFaltantes, sociosGenerico, sociosFijos, sociosPreseleccionados]);

  // Cuando viene de lista de socios (sociosFijos) y tipo liquidaciones: un mensaje por socio con todas sus cuotas
  const sociosConCuotasMasivos = useMemo((): { socio: Socio; cuotas: CuotaDisponible[] }[] => {
    if (!sociosFijos || tipoMensaje !== 'liquidaciones') return [];
    const conTelefono = cuotasDisponibles.filter((c) => c.telefono);
    const porSocio = new Map<number, CuotaDisponible[]>();
    for (const c of conTelefono) {
      if (!porSocio.has(c.socioId)) porSocio.set(c.socioId, []);
      porSocio.get(c.socioId)!.push(c);
    }
    const resultado: { socio: Socio; cuotas: CuotaDisponible[] }[] = [];
    for (const [socioId, cuotas] of porSocio) {
      const socio = socios.find((s) => s.id === socioId);
      if (socio) resultado.push({ socio, cuotas });
    }
    return resultado;
  }, [sociosFijos, tipoMensaje, cuotasDisponibles, socios]);

  // Formatear teléfono para WhatsApp (eliminar espacios, guiones, etc.)
  const formatearTelefono = (telefono: string): string => {
    if (!telefono) return '';
    // Eliminar espacios, guiones, paréntesis
    let numero = telefono.replace(/[\s\-\(\)]/g, '');
    // Si no empieza con +, agregar código de país de Argentina (54)
    if (!numero.startsWith('+')) {
      // Si empieza con 0, quitarlo
      if (numero.startsWith('0')) {
        numero = numero.substring(1);
      }
      // Si no empieza con 54, agregarlo
      if (!numero.startsWith('54')) {
        numero = '54' + numero;
      }
      numero = '+' + numero;
    }
    return numero;
  };

  const prepararEnvioIndividual = (cuota: CuotaDisponible) => {
    if (!cuota.telefono) return;
    const mensaje = generarMensaje(cuota);
    setMensajeParaEnviar(mensaje);
    setCuotaParaEnviar(cuota);
    setSocioParaEnviar(null);
    setMostrarModalMensaje(true);
  };

  const prepararEnvioSocio = (item: { socio: Socio; datosFaltantes?: string }) => {
    if (!item.socio.telefono) return;
    const mensaje = aplicarPlantillaSocio(
      mensajePersonalizado.trim() || getPlantillaPorDefecto(tipoMensaje),
      item.socio,
      item.datosFaltantes,
    );
    setMensajeParaEnviar(mensaje);
    setCuotaParaEnviar(null);
    setSocioParaEnviar(item);
    setMostrarModalMensaje(true);
  };

  const confirmarEnvio = async () => {
    const cerrarModal = () => {
      setMostrarModalMensaje(false);
      setCuotaParaEnviar(null);
      setSocioParaEnviar(null);
      setMensajeParaEnviar('');
      setArchivoPdfAdjunto('');
      setPdfAdjuntoIndividual(null);
    };

    if (modoServicioBaileys) {
      if (!baileysStatus?.connected) {
        alert(
          'El servicio WhatsApp no está conectado. Revisá el panel inferior, pulsá «Actualizar estado» o escaneá el QR.',
        );
        return;
      }
      if (!baileysStatus?.reachable) {
        alert(
          baileysStatus?.serviceError ||
            'No se alcanza el servicio WhatsApp. En el servidor definí WHATSAPP_SERVICE_URL y ejecutá la carpeta whatsapp-service.',
        );
        return;
      }
      setEnviandoBaileys(true);
      try {
        const items: WhatsAppBaileysBatchItem[] = [];
        if (cuotaParaEnviar) {
          const fila: CuotaConMesYFecha = {
            id: cuotaParaEnviar.id,
            liquidacionMensualId: cuotaParaEnviar.liquidacionMensualId,
            socioId: cuotaParaEnviar.socioId,
            numeroSocio: cuotaParaEnviar.numeroSocio,
            apellido: cuotaParaEnviar.apellido,
            nombre: cuotaParaEnviar.nombre,
            categoriaId: cuotaParaEnviar.categoriaId,
            categoriaNombre: cuotaParaEnviar.categoriaNombre,
            monto: cuotaParaEnviar.monto,
            pagado: cuotaParaEnviar.pagado,
            fechaPago: cuotaParaEnviar.fechaPago,
            medioPago: cuotaParaEnviar.medioPago,
            mes: cuotaParaEnviar.mes,
            fechaLiquidacion: cuotaParaEnviar.fechaLiquidacion,
          };
          const { base64, fileName } = liquidacionCuotasToPdfBase64([fila], nombreClub);
          items.push({
            phone: cuotaParaEnviar.telefono,
            caption: mensajeParaEnviar,
            documentBase64: base64,
            fileName,
          });
        } else if (socioParaEnviar?.socio.telefono) {
          let documentBase64: string | undefined;
          let fileName: string | undefined;
          if (pdfAdjuntoIndividual) {
            documentBase64 = await fileToBase64(pdfAdjuntoIndividual);
            fileName = pdfAdjuntoIndividual.name || 'adjunto.pdf';
          }
          items.push({
            phone: socioParaEnviar.socio.telefono,
            caption: mensajeParaEnviar,
            documentBase64,
            fileName,
          });
        } else {
          return;
        }
        const data = await apiService.sendWhatsAppBaileysBatch(items);
        const failed = data.results.filter((r) => !r.success);
        if (failed.length) {
          alert(
            `Encolados en el servicio: ${data.ok} de ${data.total}. Errores: ${failed.map((f) => f.error || '?').join('; ')}`,
          );
        } else {
          alert(
            `Listo: ${data.ok} mensaje(s) encolado(s). El servicio los envía con un intervalo entre cada uno (evitar bloqueos de WhatsApp).`,
          );
        }
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Error al enviar');
      } finally {
        setEnviandoBaileys(false);
        cerrarModal();
      }
      return;
    }

    if (cuotaParaEnviar) {
      const telefonoFormateado = formatearTelefono(cuotaParaEnviar.telefono);
      const numeroSinPlus = telefonoFormateado.replace('+', '');
      const url = `https://wa.me/${numeroSinPlus}?text=${encodeURIComponent(mensajeParaEnviar)}`;
      window.open(url, '_blank');
      if (archivoPdfAdjunto.trim()) {
        setTimeout(() => {
          alert(`Recordá adjuntar el PDF en el chat de WhatsApp:\n${archivoPdfAdjunto.trim()}`);
        }, 300);
      }
    } else if (socioParaEnviar) {
      const telefonoFormateado = formatearTelefono(socioParaEnviar.socio.telefono);
      const numeroSinPlus = telefonoFormateado.replace('+', '');
      const url = `https://wa.me/${numeroSinPlus}?text=${encodeURIComponent(mensajeParaEnviar)}`;
      window.open(url, '_blank');
    } else return;

    cerrarModal();
  };

  const enviarMensaje = (cuota: CuotaDisponible) => {
    prepararEnvioIndividual(cuota);
  };

  const getCuotasConTelefono = (): CuotaDisponible[] => {
    return cuotasSeleccionadas.size > 0
      ? cuotasDisponibles.filter((c) => cuotasSeleccionadas.has(c.id) && c.telefono)
      : cuotasDisponibles.filter((c) => c.telefono);
  };

  const getSociosDestinatariosParaMasivo = (): { socio: Socio; datosFaltantes?: string }[] => {
    if (sociosFijos) return listaSociosDestinatarios;
    if (sociosSeleccionados.size > 0) {
      return listaSociosDestinatarios.filter((item) => sociosSeleccionados.has(item.socio.id));
    }
    return listaSociosDestinatarios;
  };

  const enviarMasivo = () => {
    if (tipoMensaje === 'liquidaciones' && sociosFijos && sociosConCuotasMasivos.length > 0) {
      setSociosMasivos(sociosConCuotasMasivos);
      setSocioPreviewMasivo(sociosConCuotasMasivos[0]);
      setCuotasMasivas([]);
      setCuotaPreviewMasiva(null);
      setPlantillaMasiva(mensajePersonalizado.trim() ? mensajePersonalizado : plantillaPorDefecto());
      setMostrarModalMasivo(true);
    } else if (tipoMensaje === 'liquidaciones') {
      const cuotasConTelefono = getCuotasConTelefono();
      if (cuotasConTelefono.length === 0) {
        alert('No hay cuotas seleccionadas con teléfono registrado.');
        return;
      }
      setCuotasMasivas(cuotasConTelefono);
      setCuotaPreviewMasiva(cuotasConTelefono[0]);
      setSociosMasivos([]);
      setSocioPreviewMasivo(null);
      setPlantillaMasiva(mensajePersonalizado.trim() ? mensajePersonalizado : plantillaPorDefecto());
      setMostrarModalMasivo(true);
    } else {
      const lista = getSociosDestinatariosParaMasivo();
      if (lista.length === 0) {
        alert('No hay socios seleccionados con teléfono registrado.');
        return;
      }
      setSociosMasivos(lista);
      setSocioPreviewMasivo(lista[0]);
      setCuotasMasivas([]);
      setCuotaPreviewMasiva(null);
      setPlantillaMasiva(mensajePersonalizado.trim() ? mensajePersonalizado : getPlantillaPorDefecto(tipoMensaje));
      setMostrarModalMasivo(true);
    }
  };

  const confirmarEnvioMasivo = async () => {
    if (modoServicioBaileys) {
      if (!baileysStatus?.connected) {
        alert(
          'El servicio WhatsApp no está conectado. Revisá el panel inferior, pulsá «Actualizar estado» o escaneá el QR.',
        );
        return;
      }
      if (!baileysStatus?.reachable) {
        alert(
          baileysStatus?.serviceError ||
            'No se alcanza el servicio WhatsApp. Revisá WHATSAPP_SERVICE_URL y el proceso whatsapp-service.',
        );
        return;
      }
      setEnviandoBaileys(true);
      try {
        const items: WhatsAppBaileysBatchItem[] = [];
        let sharedB64: string | undefined;
        let sharedFn: string | undefined;
        if (tipoMensaje !== 'liquidaciones' && pdfMasivoOpcional) {
          sharedB64 = await fileToBase64(pdfMasivoOpcional);
          sharedFn = pdfMasivoOpcional.name || 'adjunto.pdf';
        }

        if (cuotasMasivas.length > 0) {
          for (const cuota of cuotasMasivas) {
            const fila: CuotaConMesYFecha = {
              id: cuota.id,
              liquidacionMensualId: cuota.liquidacionMensualId,
              socioId: cuota.socioId,
              numeroSocio: cuota.numeroSocio,
              apellido: cuota.apellido,
              nombre: cuota.nombre,
              categoriaId: cuota.categoriaId,
              categoriaNombre: cuota.categoriaNombre,
              monto: cuota.monto,
              pagado: cuota.pagado,
              fechaPago: cuota.fechaPago,
              medioPago: cuota.medioPago,
              mes: cuota.mes,
              fechaLiquidacion: cuota.fechaLiquidacion,
            };
            const { base64, fileName } = liquidacionCuotasToPdfBase64([fila], nombreClub);
            items.push({
              phone: cuota.telefono,
              caption: aplicarPlantilla(plantillaMasiva, cuota),
              documentBase64: base64,
              fileName,
            });
          }
        } else if (sociosMasivos.length > 0) {
          for (const item of sociosMasivos) {
            if (!item.socio.telefono) continue;
            const conCuotas = item.cuotas?.length;
            let documentBase64 = sharedB64;
            let fileName = sharedFn;
            if (conCuotas) {
              const filas: CuotaConMesYFecha[] = item.cuotas!.map((c) => ({
                id: c.id,
                liquidacionMensualId: c.liquidacionMensualId,
                socioId: c.socioId,
                numeroSocio: c.numeroSocio,
                apellido: c.apellido,
                nombre: c.nombre,
                categoriaId: c.categoriaId,
                categoriaNombre: c.categoriaNombre,
                monto: c.monto,
                pagado: c.pagado,
                fechaPago: c.fechaPago,
                medioPago: c.medioPago,
                mes: c.mes,
                fechaLiquidacion: c.fechaLiquidacion,
              }));
              const pdf = liquidacionCuotasToPdfBase64(filas, nombreClub);
              documentBase64 = pdf.base64;
              fileName = pdf.fileName;
            }
            const mensaje = conCuotas
              ? aplicarPlantillaMultiCuota(plantillaMasiva, item.socio, item.cuotas!)
              : aplicarPlantillaSocio(plantillaMasiva, item.socio, item.datosFaltantes);
            items.push({
              phone: item.socio.telefono,
              caption: mensaje,
              documentBase64,
              fileName,
            });
          }
        }

        if (!items.length) {
          alert('No hay destinatarios válidos.');
          return;
        }

        const data = await apiService.sendWhatsAppBaileysBatch(items);
        const failed = data.results.filter((r) => !r.success);
        if (failed.length) {
          alert(
            `Encolados: ${data.ok} de ${data.total}. Errores: ${failed.map((f) => f.error || '?').join('; ')}`,
          );
        } else {
          alert(
            `Listo: ${data.ok} mensaje(s) encolado(s). El servicio los envía con intervalo entre cada envío.`,
          );
        }
        setMostrarModalMasivo(false);
        setCuotasMasivas([]);
        setCuotaPreviewMasiva(null);
        setSociosMasivos([]);
        setSocioPreviewMasivo(null);
        setPdfMasivoOpcional(null);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Error al enviar');
      } finally {
        setEnviandoBaileys(false);
      }
      return;
    }

    if (cuotasMasivas.length > 0) {
      setPlantillaMasiva(mensajePersonalizado);
      setMostrarModalMasivo(false);
      cuotasMasivas.forEach((cuota, index) => {
        setTimeout(() => {
          const telefonoFormateado = formatearTelefono(cuota.telefono);
          const numeroSinPlus = telefonoFormateado.replace('+', '');
          const mensaje = aplicarPlantilla(plantillaMasiva, cuota);
          window.open(`https://wa.me/${numeroSinPlus}?text=${encodeURIComponent(mensaje)}`, '_blank');
        }, index * 1500);
      });
      setCuotasMasivas([]);
      setCuotaPreviewMasiva(null);
    } else if (sociosMasivos.length > 0) {
      setMostrarModalMasivo(false);
      const conCuotas = sociosMasivos[0]?.cuotas;
      sociosMasivos.forEach((item, index) => {
        setTimeout(() => {
          const telefonoFormateado = formatearTelefono(item.socio.telefono);
          const numeroSinPlus = telefonoFormateado.replace('+', '');
          const mensaje =
            conCuotas && item.cuotas?.length
              ? aplicarPlantillaMultiCuota(plantillaMasiva, item.socio, item.cuotas)
              : aplicarPlantillaSocio(plantillaMasiva, item.socio, item.datosFaltantes);
          window.open(`https://wa.me/${numeroSinPlus}?text=${encodeURIComponent(mensaje)}`, '_blank');
        }, index * 1500);
      });
      setSociosMasivos([]);
      setSocioPreviewMasivo(null);
    }
  };

  const toggleSeleccion = (id: number) => {
    setCuotasSeleccionadas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  };

  const toggleSocioSeleccion = (id: number) => {
    setSociosSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  };

  const seleccionarTodos = () => {
    setCuotasSeleccionadas(new Set(cuotasDisponibles.map((c) => c.id)));
  };

  const deseleccionarTodos = () => {
    setCuotasSeleccionadas(new Set());
  };

  const seleccionarTodosSocios = () => {
    setSociosSeleccionados(new Set(listaSociosDestinatarios.map((item) => item.socio.id)));
  };

  const deseleccionarTodosSocios = () => {
    setSociosSeleccionados(new Set());
  };

  const cuotasConTelefono = cuotasDisponibles.filter((c) => c.telefono);
  const cuotasSinTelefono = cuotasDisponibles.filter((c) => !c.telefono);
  const sociosConTelefono = listaSociosDestinatarios.filter((item) => item.socio.telefono);
  const countDestinatarios =
    tipoMensaje === 'liquidaciones' && sociosFijos
      ? sociosConCuotasMasivos.length
      : tipoMensaje === 'liquidaciones'
        ? (cuotasSeleccionadas.size > 0 ? cuotasSeleccionadas.size : cuotasConTelefono.length)
        : sociosFijos
          ? sociosConTelefono.length
          : (sociosSeleccionados.size > 0 ? sociosSeleccionados.size : sociosConTelefono.length);

  return (
    <div className="enviar-whatsapp">
      <div className="enviar-whatsapp-header">
        <h1>Enviar mensajes a socios</h1>
        {onVolver && (
          <button onClick={onVolver} className="btn-volver">
            ← Volver
          </button>
        )}
      </div>

      <WhatsAppServicioEstadoUI
        modoServicioBaileys={modoServicioBaileys}
        status={baileysStatus}
        onRefresh={refrescarBaileys}
        variant="panel"
      />

      <div className="enviar-whatsapp-tipo">
        <label>Tipo de mensaje o plantilla</label>
        <select
          className="enviar-whatsapp-tipo-select"
          value={seleccionTipoOPlantilla}
          onChange={(e) => handleCambioTipoOPlantilla(e.target.value)}
        >
          <option value="tipo:liquidaciones">Liquidaciones (recordatorio de cuotas)</option>
          <option value="tipo:cumpleaños">Cumpleaños</option>
          <option value="tipo:al_dia">Al día (sin deuda)</option>
          <option value="tipo:datos_faltantes">Datos faltantes</option>
          <option value="tipo:generico">Mensaje genérico</option>
          <option value="" disabled>——— Plantillas guardadas ———</option>
          {plantillas.map((p) => (
            <option key={p.id} value={`plantilla:${p.id}`}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      {tipoMensaje === 'liquidaciones' && (
        <div className="enviar-whatsapp-filtros">
          <label>
            <input
              type="checkbox"
              checked={soloPendientes}
              onChange={(e) => setSoloPendientes(e.target.checked)}
            />
            Solo cuotas pendientes
          </label>
        </div>
      )}

      <div className="enviar-whatsapp-mensaje">
        <div className="whatsapp-plantillas-row">
          <button type="button" className="whatsapp-plantillas-btn" onClick={guardarComoNueva}>
            Guardar como nueva
          </button>
          <button
            type="button"
            className="whatsapp-plantillas-btn"
            onClick={actualizarPlantilla}
            disabled={esTipo}
          >
            Actualizar
          </button>
          <button
            type="button"
            className="whatsapp-plantillas-btn whatsapp-plantillas-btn-danger"
            onClick={eliminarPlantilla}
            disabled={esTipo}
          >
            Eliminar
          </button>
        </div>

        <label htmlFor="mensaje-personalizado">
          Mensaje / plantilla a usar en este envío
        </label>
        <textarea
          id="mensaje-personalizado"
          value={mensajePersonalizado}
          onChange={(e) => setMensajePersonalizado(e.target.value)}
          placeholder="Ej: Hola {nombre} {apellido}! Tu cuota de {mes} es ${'{monto}'}."
          rows={4}
        />
        <small className="plantilla-ayuda">
          Al guardar, la plantilla se guarda con las variables (ej: {'{nombre}'}). Al enviar, se reemplazan por los datos reales de cada socio.
        </small>
      </div>

      <div className="enviar-whatsapp-acciones">
        {!sociosFijos && tipoMensaje === 'liquidaciones' && (
          <>
            <button onClick={seleccionarTodos} className="btn-seleccionar">
              Seleccionar Todos
            </button>
            <button onClick={deseleccionarTodos} className="btn-deseleccionar">
              Deseleccionar Todos
            </button>
          </>
        )}
        {!sociosFijos && tipoMensaje !== 'liquidaciones' && (
          <>
            <button onClick={seleccionarTodosSocios} className="btn-seleccionar">
              Seleccionar Todos
            </button>
            <button onClick={deseleccionarTodosSocios} className="btn-deseleccionar">
              Deseleccionar Todos
            </button>
          </>
        )}
        <button
          onClick={enviarMasivo}
          className="btn-enviar-masivo"
          disabled={
            tipoMensaje === 'liquidaciones'
              ? sociosFijos
                ? sociosConCuotasMasivos.length === 0
                : cuotasConTelefono.length === 0
              : sociosConTelefono.length === 0
          }
        >
          📱 Enviar Masivo ({countDestinatarios} mensajes)
        </button>
      </div>

      {tipoMensaje === 'liquidaciones' && cuotasSinTelefono.length > 0 && (
        <div className="enviar-whatsapp-alerta">
          <p>⚠️ {cuotasSinTelefono.length} socio(s) no tienen teléfono registrado y no podrán recibir mensajes.</p>
        </div>
      )}

      {tipoMensaje !== 'liquidaciones' && listaSociosDestinatarios.some((item) => !item.socio.telefono) && (
        <div className="enviar-whatsapp-alerta">
          <p>⚠️ Algunos socios no tienen teléfono registrado y no podrán recibir mensajes.</p>
        </div>
      )}

      <div className="enviar-whatsapp-info">
        {tipoMensaje === 'liquidaciones' ? (
          <p>
            Total de cuotas: {cuotasDisponibles.length} | Con teléfono: {cuotasConTelefono.length} | Sin teléfono: {cuotasSinTelefono.length}
          </p>
        ) : (
          <p>
            Destinatarios: {listaSociosDestinatarios.length} | Con teléfono: {sociosConTelefono.length}
          </p>
        )}
      </div>

      {tipoMensaje === 'liquidaciones' ? (
        <div className="tabla-wrapper">
          <table className="tabla-enviar-whatsapp">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={cuotasSeleccionadas.size === cuotasDisponibles.length && cuotasDisponibles.length > 0}
                    onChange={(e) => (e.target.checked ? seleccionarTodos() : deseleccionarTodos())}
                  />
                </th>
                <th>N° Socio</th>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Mes</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {cuotasDisponibles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="sin-datos">
                    No hay cuotas disponibles para enviar.
                  </td>
                </tr>
              ) : (
                cuotasDisponibles.map((cuota) => (
                  <tr key={cuota.id} className={!cuota.telefono ? 'sin-telefono' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={cuotasSeleccionadas.has(cuota.id)}
                        onChange={() => toggleSeleccion(cuota.id)}
                        disabled={!cuota.telefono}
                      />
                    </td>
                    <td>{cuota.numeroSocio}</td>
                    <td>{cuota.apellido}</td>
                    <td>{cuota.nombre}</td>
                    <td>{cuota.telefono || <span className="sin-telefono-text">Sin teléfono</span>}</td>
                    <td>{getNombreMes(cuota.mes)}</td>
                    <td>${cuota.monto.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${cuota.pagado ? 'badge-pagado' : 'badge-pendiente'}`}>
                        {cuota.pagado ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => enviarMensaje(cuota)}
                        className="btn-enviar-individual"
                        disabled={!cuota.telefono}
                        title={!cuota.telefono ? 'Sin teléfono registrado' : 'Enviar mensaje individual'}
                      >
                        📱 Enviar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="tabla-wrapper">
          <table className="tabla-enviar-whatsapp tabla-enviar-socios">
            <thead>
              <tr>
                {!sociosFijos && (
                  <th>
                    <input
                      type="checkbox"
                      checked={
                        (() => {
                          const conTel = listaSociosDestinatarios.filter((i) => i.socio.telefono);
                          return conTel.length > 0 && conTel.every((i) => sociosSeleccionados.has(i.socio.id));
                        })()
                      }
                      onChange={(e) => (e.target.checked ? seleccionarTodosSocios() : deseleccionarTodosSocios())}
                    />
                  </th>
                )}
                <th>N° Socio</th>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Motivo</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {listaSociosDestinatarios.length === 0 ? (
                <tr>
                  <td colSpan={sociosFijos ? 6 : 7} className="sin-datos">
                    No hay destinatarios para este tipo de mensaje.
                  </td>
                </tr>
              ) : (
                listaSociosDestinatarios.map((item) => (
                  <tr key={item.socio.id} className={!item.socio.telefono ? 'sin-telefono' : ''}>
                    {!sociosFijos && (
                      <td>
                        <input
                          type="checkbox"
                          checked={sociosSeleccionados.has(item.socio.id)}
                          onChange={() => toggleSocioSeleccion(item.socio.id)}
                          disabled={!item.socio.telefono}
                        />
                      </td>
                    )}
                    <td>{item.socio.numeroSocio}</td>
                    <td>{item.socio.apellido}</td>
                    <td>{item.socio.nombre}</td>
                    <td>{item.socio.telefono || <span className="sin-telefono-text">Sin teléfono</span>}</td>
                    <td>
                      {tipoMensaje === 'cumpleaños' && 'Cumple este mes'}
                      {tipoMensaje === 'al_dia' && 'Al día'}
                      {tipoMensaje === 'datos_faltantes' && (item.datosFaltantes || '-')}
                      {tipoMensaje === 'generico' && 'Genérico'}
                    </td>
                    <td>
                      <button
                        onClick={() => prepararEnvioSocio(item)}
                        className="btn-enviar-individual"
                        disabled={!item.socio.telefono}
                        title={!item.socio.telefono ? 'Sin teléfono' : 'Enviar mensaje'}
                      >
                        📱 Enviar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para mostrar y editar mensaje antes de enviar (cuota o socio) */}
      {mostrarModalMensaje && (cuotaParaEnviar || socioParaEnviar) && (
        <div className="modal-overlay" onClick={() => setMostrarModalMensaje(false)}>
          <div className="modal-mensaje-whatsapp" onClick={(e) => e.stopPropagation()}>
            <div className="modal-mensaje-header">
              <h2>Vista previa del mensaje WhatsApp</h2>
              <button
                className="btn-cerrar-modal"
                onClick={() => {
                  setMostrarModalMensaje(false);
                  setCuotaParaEnviar(null);
                  setSocioParaEnviar(null);
                  setMensajeParaEnviar('');
                  setArchivoPdfAdjunto('');
                  setPdfAdjuntoIndividual(null);
                }}
                title="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="modal-mensaje-info">
              {cuotaParaEnviar ? (
                <>
                  <p><strong>Destinatario:</strong> {cuotaParaEnviar.nombre} {cuotaParaEnviar.apellido}</p>
                  <p><strong>Teléfono:</strong> {cuotaParaEnviar.telefono}</p>
                  <p><strong>Mes:</strong> {getNombreMes(cuotaParaEnviar.mes)}</p>
                </>
              ) : socioParaEnviar && (
                <>
                  <p><strong>Destinatario:</strong> {socioParaEnviar.socio.nombre} {socioParaEnviar.socio.apellido}</p>
                  <p><strong>Teléfono:</strong> {socioParaEnviar.socio.telefono}</p>
                  {socioParaEnviar.datosFaltantes && (
                    <p><strong>Datos faltantes:</strong> {socioParaEnviar.datosFaltantes}</p>
                  )}
                </>
              )}
            </div>

            <div className="modal-mensaje-editor">
              {cuotaParaEnviar && modoServicioBaileys && (
                <p className="whatsapp-baileys-msg info">
                  Se adjuntará un PDF generado automáticamente con el detalle de esta cuota.
                </p>
              )}
              {cuotaParaEnviar && !modoServicioBaileys && (
                <>
                  <label htmlFor="archivo-pdf-adjunto">Archivo PDF a adjuntar (recordatorio, opcional)</label>
                  <input
                    id="archivo-pdf-adjunto"
                    type="text"
                    value={archivoPdfAdjunto}
                    onChange={(e) => setArchivoPdfAdjunto(e.target.value)}
                    placeholder="Ej: Liquidación Juan Pérez.pdf"
                    className="input-archivo-adjunto"
                  />
                </>
              )}
              {socioParaEnviar && modoServicioBaileys && (
                <label className="whatsapp-baileys-file-label">
                  PDF opcional para adjuntar
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setPdfAdjuntoIndividual(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
              <label htmlFor="mensaje-editable">Mensaje a enviar:</label>
              <textarea
                id="mensaje-editable"
                value={mensajeParaEnviar}
                onChange={(e) => setMensajeParaEnviar(e.target.value)}
                rows={12}
                className="textarea-mensaje-editable"
              />
            </div>

            <WhatsAppServicioQrEnModal
              modoServicioBaileys={modoServicioBaileys}
              status={baileysStatus}
              onRefresh={refrescarBaileys}
            />

            <div className="modal-mensaje-acciones">
              <button
                className="btn-cancelar-envio"
                onClick={() => {
                  setMostrarModalMensaje(false);
                  setCuotaParaEnviar(null);
                  setSocioParaEnviar(null);
                  setMensajeParaEnviar('');
                  setArchivoPdfAdjunto('');
                  setPdfAdjuntoIndividual(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="btn-confirmar-envio"
                onClick={() => void confirmarEnvio()}
                disabled={enviandoBaileys}
              >
                {enviandoBaileys ? 'Enviando…' : modoServicioBaileys ? '📱 Enviar (servicio)' : '📱 Enviar por WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal masivo: editar una sola vez la plantilla (cuotas o socios) */}
      {mostrarModalMasivo && (cuotaPreviewMasiva || socioPreviewMasivo) && (
        <div className="modal-overlay" onClick={() => setMostrarModalMasivo(false)}>
          <div className="modal-mensaje-whatsapp" onClick={(e) => e.stopPropagation()}>
            <div className="modal-mensaje-header">
              <h2>Envío masivo - editar mensaje (una sola vez)</h2>
              <button
                className="btn-cerrar-modal"
                onClick={() => setMostrarModalMasivo(false)}
                title="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="modal-mensaje-info">
              <p>
                <strong>Se enviará a:</strong>{' '}
                {cuotasMasivas.length > 0 ? cuotasMasivas.length : sociosMasivos.length} destinatario(s)
              </p>
              <p className="modo-masivo-info">
                Podés editar el texto UNA sola vez. Se aplicará a todos los envíos (reemplazando variables).
              </p>
              <p>
                <strong>Vista previa (primer destinatario):</strong>{' '}
                {cuotaPreviewMasiva
                  ? `${cuotaPreviewMasiva.nombre} ${cuotaPreviewMasiva.apellido}`
                  : socioPreviewMasivo && `${socioPreviewMasivo.socio.nombre} ${socioPreviewMasivo.socio.apellido}`}
              </p>
            </div>

            <div className="modal-mensaje-editor">
              <label htmlFor="plantilla-masiva">Plantilla del mensaje:</label>
              <textarea
                id="plantilla-masiva"
                value={plantillaMasiva}
                onChange={(e) => setPlantillaMasiva(e.target.value)}
                rows={10}
                className="textarea-mensaje-editable"
              />
              <small>
                {tipoMensaje === 'liquidaciones'
                  ? "Variables: {nombre}, {apellido}, {numeroSocio}, {categoria}, {mes}, {monto}, {detalleCuotas}"
                  : "Variables: {nombre}, {apellido}, {numeroSocio}, {categoria}, {datosFaltantes}, {email}, {telefono}"}
              </small>
              {modoServicioBaileys && tipoMensaje !== 'liquidaciones' && socioPreviewMasivo && (
                <label className="whatsapp-baileys-file-label" style={{ marginTop: '0.75rem', display: 'block' }}>
                  PDF opcional (mismo archivo para todos los destinatarios)
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setPdfMasivoOpcional(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
              {modoServicioBaileys && tipoMensaje === 'liquidaciones' && (
                <p className="whatsapp-baileys-msg info" style={{ marginTop: '0.75rem' }}>
                  En liquidaciones, se genera un PDF por destinatario con el detalle de la(s) cuota(s).
                </p>
              )}
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontWeight: 600, color: '#2d3748' }}>Vista previa:</label>
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
                  {cuotaPreviewMasiva
                    ? aplicarPlantilla(plantillaMasiva, cuotaPreviewMasiva)
                    : socioPreviewMasivo?.cuotas?.length
                      ? aplicarPlantillaMultiCuota(
                          plantillaMasiva,
                          socioPreviewMasivo.socio,
                          socioPreviewMasivo.cuotas,
                        )
                      : socioPreviewMasivo
                        ? aplicarPlantillaSocio(
                            plantillaMasiva,
                            socioPreviewMasivo.socio,
                            socioPreviewMasivo.datosFaltantes,
                          )
                        : ''}
                </pre>
              </div>
            </div>

            <WhatsAppServicioQrEnModal
              modoServicioBaileys={modoServicioBaileys}
              status={baileysStatus}
              onRefresh={refrescarBaileys}
            />

            <div className="modal-mensaje-acciones">
              <button className="btn-cancelar-masivo" onClick={() => setMostrarModalMasivo(false)}>
                Cancelar
              </button>
              <button
                className="btn-confirmar-envio"
                onClick={() => void confirmarEnvioMasivo()}
                disabled={enviandoBaileys}
              >
                {enviandoBaileys ? 'Enviando…' : modoServicioBaileys ? '📱 Enviar masivo (servicio)' : '📱 Iniciar envío masivo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

