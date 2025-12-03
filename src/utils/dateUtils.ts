/**
 * Converte uma string de data UTC para o horário local do navegador
 * @param utcString - String de data em formato ISO (UTC)
 * @returns String formatada no horário local
 */
export function formatDateToLocal(utcString: string): string {
  // Garantir que a string seja interpretada como UTC
  // Se não terminar com Z, adicionar para forçar interpretação UTC
  const utcDateString = utcString.endsWith('Z') ? utcString : utcString + 'Z';
  const date = new Date(utcDateString);
  
  // Verificar se a data é válida
  if (isNaN(date.getTime())) {
    console.warn('Data inválida:', utcString);
    return utcString;
  }
  
  // Converter para horário local do navegador
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Converte uma string UTC para formato datetime-local (horário local)
 * @param utcString - String de data em formato ISO (UTC)
 * @returns String no formato YYYY-MM-DDTHH:mm para input datetime-local
 */
export function utcToLocalDatetime(utcString: string): string {
  const utcDateString = utcString.endsWith('Z') ? utcString : utcString + 'Z';
  const date = new Date(utcDateString);
  
  if (isNaN(date.getTime())) {
    console.warn('Data inválida:', utcString);
    return '';
  }
  
  // Obter componentes no horário local
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Converte datetime-local (horário local) para UTC
 * @param localString - String no formato YYYY-MM-DDTHH:mm (horário local)
 * @returns String ISO em UTC
 */
export function localDatetimeToUtc(localString: string): string {
  if (!localString) return '';
  
  // datetime-local já está no horário local, então criamos a data e convertemos para UTC
  const date = new Date(localString);
  
  if (isNaN(date.getTime())) {
    console.warn('Data inválida:', localString);
    return '';
  }
  
  return date.toISOString();
}


