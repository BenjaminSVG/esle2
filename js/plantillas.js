/*
 * Plantillas: arrancar sin la hoja en blanco.
 *
 * Son distintas de los "Ejemplos" del mismo menú: un ejemplo es un programa
 * completo para leer y entender; una plantilla es un esqueleto de tres o
 * cuatro líneas para pegar y completar. Se insertan en la posición del
 * cursor —igual que el menú "Insertar" de ESLE2 Visual— y no reemplazan el
 * programa: sirven tanto para arrancar de cero como para meter un "si" en
 * medio de algo que ya se estaba escribiendo.
 */
(function (global) {
  'use strict';

  global.PLANTILLAS = [
    {
      nombre: 'Estructura básica',
      codigo: `programa mi_programa
var

inicio

fin
`
    },
    {
      nombre: 'Si / Sino',
      codigo: `si (condicion)
{

sino

}
`
    },
    {
      nombre: 'Bucle desde (contador)',
      codigo: `desde i = 1 hasta 10
{

}
`
    },
    {
      nombre: 'Bucle mientras',
      codigo: `mientras (condicion)
{

}
`
    },
    {
      nombre: 'Bucle repetir',
      codigo: `repetir

hasta (condicion)
`
    },
    {
      nombre: 'Subrutina',
      codigo: `subrutina mi_subrutina (n : numerico)
inicio

fin
`
    }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
