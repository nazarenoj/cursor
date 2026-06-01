import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { Parser } from 'node-dbf';

interface ConversionOptions {
  inputFile: string;
  outputFile?: string;
  sheetName?: string;
  encoding?: string;
}

/**
 * Lee un archivo DBF y lo convierte a Excel
 */
async function convertDbfToExcel(options: ConversionOptions): Promise<void> {
  const { inputFile, outputFile, sheetName = 'Datos', encoding = 'latin1' } = options;

  // Validar que el archivo existe
  if (!fs.existsSync(inputFile)) {
    throw new Error(`El archivo ${inputFile} no existe`);
  }

  // Validar extensión
  if (!inputFile.toLowerCase().endsWith('.dbf')) {
    throw new Error('El archivo debe tener extensión .dbf');
  }

  console.log(`Leyendo archivo DBF: ${inputFile}`);

  return new Promise((resolve, reject) => {
    const parser = new Parser(inputFile, { encoding });
    const records: any[] = [];
    let fields: any[] = [];

    parser.on('start', (p) => {
      fields = p.fields;
      console.log(`Encontradas ${fields.length} columnas`);
    });

    parser.on('record', (record) => {
      records.push(record);
    });

    parser.on('end', () => {
      console.log(`Encontrados ${records.length} registros`);

      if (records.length === 0) {
        reject(new Error('No se encontraron registros en el archivo DBF'));
        return;
      }

      try {
        // Crear workbook de Excel
        const workbook = XLSX.utils.book_new();

        // Obtener nombres de columnas
        const columnNames = fields.map((field: any) => field.name || '');

        // Convertir datos a formato de hoja de cálculo
        const worksheetData = [
          // Encabezados
          columnNames,
          // Datos
          ...records.map(record => 
            columnNames.map(colName => {
              const value = record[colName];
              // Manejar valores nulos o undefined
              if (value === null || value === undefined) {
                return '';
              }
              // Convertir fechas si es necesario
              if (value instanceof Date) {
                return value;
              }
              // Convertir Buffer a string si es necesario
              if (Buffer.isBuffer(value)) {
                return value.toString(encoding);
              }
              return value;
            })
          )
        ];

        // Crear worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        // Agregar worksheet al workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // Determinar nombre del archivo de salida
        const outputFileName = outputFile || 
          path.join(
            path.dirname(inputFile),
            path.basename(inputFile, '.dbf') + '.xlsx'
          );

        // Escribir archivo Excel
        XLSX.writeFile(workbook, outputFileName);

        console.log(`Archivo Excel creado exitosamente: ${outputFileName}`);
        console.log(`Total de registros convertidos: ${records.length}`);
        resolve();
      } catch (error: any) {
        reject(error);
      }
    });

    parser.on('error', (error) => {
      reject(new Error(`Error al leer archivo DBF: ${error.message}`));
    });
  });
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Uso: npm start <archivo.dbf> [archivo-salida.xlsx] [nombre-hoja]');
    console.log('');
    console.log('Ejemplos:');
    console.log('  npm start archivo.dbf');
    console.log('  npm start archivo.dbf salida.xlsx');
    console.log('  npm start archivo.dbf salida.xlsx "Mi Hoja"');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1];
  const sheetName = args[2];

  try {
    await convertDbfToExcel({
      inputFile,
      outputFile,
      sheetName
    });
  } catch (error: any) {
    console.error('Error al convertir archivo:', error.message);
    process.exit(1);
  }
}

// Ejecutar función principal
main();

export { convertDbfToExcel };

