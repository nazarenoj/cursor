import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RegistrarPagos } from '../components/RegistrarPagos';
import { apiService } from '../services/api';

export const PagosPage = () => {
  const [params] = useSearchParams();
  const socioIdParam = params.get('socioId');
  const socioId = useMemo(() => {
    if (!socioIdParam) return undefined;
    const id = Number(socioIdParam);
    if (Number.isNaN(id)) return undefined;
    return id;
  }, [socioIdParam]);

  const { data: socio } = useQuery({
    queryKey: ['socio-detalle-pagos', socioId],
    queryFn: () => apiService.getSocio(socioId as number),
    enabled: socioId != null,
  });

  return <RegistrarPagos socio={socio} />;
};



