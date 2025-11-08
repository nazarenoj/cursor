import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RegistrarPagos } from '../components/RegistrarPagos';
import { useSocios } from '../hooks/useSocios';

export const PagosPage = () => {
  const [params] = useSearchParams();
  const { getSocioById } = useSocios();

  const socioIdParam = params.get('socioId');
  const socio = useMemo(() => {
    if (!socioIdParam) return undefined;
    const id = Number(socioIdParam);
    if (Number.isNaN(id)) return undefined;
    return getSocioById(id);
  }, [getSocioById, socioIdParam]);

  return <RegistrarPagos socio={socio} />;
};



