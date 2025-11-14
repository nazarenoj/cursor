const toCamel = (row) => {
  if (!row || typeof row !== 'object') return row;
  const result = {};
  Object.keys(row).forEach((key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    result[camelKey] = row[key];
  });
  return result;
};

const mapCategoria = (row) => {
  const data = toCamel(row);
  if (data && data.costoCuota !== undefined && data.costoCuota !== null) {
    data.costoCuota = Number(data.costoCuota);
  }
  return data;
};

const mapSocio = (row) => {
  const data = toCamel(row);
  if (data) {
    if (data.numeroSocio !== undefined) data.numeroSocio = Number(data.numeroSocio);
    if (data.categoriaId !== undefined) data.categoriaId = Number(data.categoriaId);
  }
  return data;
};

const mapLiquidacionMensual = (row) => toCamel(row);

const mapLiquidacionCuota = (row) => {
  const data = toCamel(row);
  if (data) {
    ['liquidacionMensualId', 'socioId', 'numeroSocio', 'categoriaId'].forEach((field) => {
      if (data[field] !== undefined && data[field] !== null) {
        data[field] = Number(data[field]);
      }
    });
    if (data.monto !== undefined && data.monto !== null) {
      data.monto = Number(data.monto);
    }
    data.pagado = Boolean(data.pagado);
  }
  return data;
};

module.exports = {
  toCamel,
  mapCategoria,
  mapSocio,
  mapLiquidacionMensual,
  mapLiquidacionCuota,
};


