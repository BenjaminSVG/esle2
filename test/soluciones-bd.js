/*
 * Las cincuenta soluciones de referencia del curso de ESLE2 BD.
 *
 * No son «la» respuesta: son una. El corrector mira la base que quedó y el
 * resultado, así que cualquier consulta que llegue al mismo lugar vale igual.
 * Están acá para que test-curso-bd.js pueda comprobar que los cincuenta
 * ejercicios tienen al menos una solución que pasa — si no, el enunciado
 * estaría pidiendo algo imposible y nadie se enteraría hasta que un alumno se
 * quede trabado.
 */
'use strict';

const prog = cuerpo => 'inicio\n' + cuerpo.replace(/^/gm, '   ').replace(/^\s+$/gm, '') + '\nfin\n';

module.exports = {
  b1: prog('CREAR TABLA ciudades (id ENTERO, nombre TEXTO)'),

  b2: prog(`CREAR TABLA productos (
   codigo ENTERO,
   nombre CADENA(40),
   precio REAL,
   activo LOGICO
)`),

  b3: prog(`CREAR TABLA ciudades (id ENTERO, nombre TEXTO)
INSERTAR DENTRO ciudades VALORES (1, 'Luque')`),

  b4: prog(`CREAR TABLA ciudades (id ENTERO, nombre TEXTO)
INSERTAR DENTRO ciudades VALORES (1, 'Luque'), (2, 'Asuncion'), (3, 'Encarnacion')`),

  b5: prog('SELECCIONAR nombre, nota DE alumnos'),

  b6: prog('SELECCIONAR nombre DE alumnos DONDE nota >= 7'),

  b7: prog("SELECCIONAR nombre, nota DE alumnos DONDE ciudad = 'Luque'"),

  b8: prog("SELECCIONAR nombre DE alumnos DONDE ciudad = 'Luque' Y nota >= 7"),

  b9: prog("SELECCIONAR nombre DE alumnos DONDE NO ciudad = 'Luque' O nota = 9"),

  b10: prog('SELECCIONAR ciudad, nombre DE alumnos ORDENAR POR ciudad, nombre'),

  b11: prog('SELECCIONAR nombre, nota DE alumnos ORDENAR POR nota DESCENDENTE LIMITE 2'),

  b12: prog('SELECCIONAR nombre DE alumnos ORDENAR POR nombre LIMITE 2 DESPLAZAMIENTO 2'),

  b13: prog('SELECCIONAR DISTINTOS ciudad DE alumnos ORDENAR POR ciudad'),

  b14: prog('SELECCIONAR nombre DE alumnos DONDE nota ES NULO'),

  b15: prog(`CREAR TABLA alumnos (
   id     ENTERO,
   nombre TEXTO,
   ciudad TEXTO POR DEFECTO 'Asuncion'
)
INSERTAR DENTRO alumnos (id, nombre) VALORES (1, 'Ana')`),

  b16: prog(`CREAR TABLA alumnos (id ENTERO CLAVE PRIMARIA, nombre TEXTO)
INSERTAR DENTRO alumnos VALORES (1, 'Ana'), (2, 'Beto')`),

  b17: prog(`CREAR TABLA gente (
   id     ENTERO CLAVE PRIMARIA,
   nombre TEXTO NO NULO,
   correo TEXTO UNICO
)`),

  b18: prog(`ACTUALIZAR alumnos CONJUNTO nota = nota + 1 DONDE nota < 7
SELECCIONAR nombre, nota DE alumnos ORDENAR POR nombre`),

  b19: prog('BORRAR DE alumnos DONDE nota ES NULO'),

  b20: prog(`SELECCIONAR nombre COMO alumno, nota * 10 COMO porcentaje
DE alumnos
DONDE nota ES NO NULO`),

  b21: `var
   i : numerico
inicio
   consultar ("SELECCIONAR nombre, nota DE alumnos ORDENAR POR nombre")
   desde i = 1 hasta filas ()
   {
      imprimir (dato (i, "nombre"), ": ")
      si (hay_dato (i, "nota"))
      {
         imprimir (dato (i, "nota"), "\\n")
      sino
         imprimir ("sin nota\\n")
      }
   }
fin
`,

  b22: prog('SELECCIONAR MAYUSCULAS (nombre) COMO nombre DE alumnos ORDENAR POR nombre'),

  b23: prog(`SELECCIONAR nombre,
           LONGITUD (nombre) COMO largo,
           SUBCADENA (nombre, 1, 1) COMO inicial
DE alumnos
ORDENAR POR nombre`),

  b24: prog(`SELECCIONAR vendedor, monto, REDONDEAR (monto / 1000, 1) COMO miles
DE ventas
ORDENAR POR id`),

  b25: prog(`SELECCIONAR nombre, SI_NULO (nota, 0) COMO nota
DE alumnos
ORDENAR POR nombre`),

  b26: prog("SELECCIONAR nombre DE alumnos DONDE nombre COMO_PATRON '%a'"),

  b27: prog(`SELECCIONAR id DE ventas
DONDE monto ENTRE 9000 Y 24000 O rubro EN ('queso', 'jabon')
ORDENAR POR id`),

  b28: prog('SELECCIONAR CONTAR (*) COMO cuantas, SUMAR (monto) COMO total DE ventas'),

  b29: prog(`SELECCIONAR PROMEDIO (nota) COMO promedio,
           MINIMO (nota) COMO peor,
           MAXIMO (nota) COMO mejor
DE alumnos`),

  b30: prog(`SELECCIONAR vendedor, SUMAR (monto) COMO total
DE ventas
AGRUPAR POR vendedor
ORDENAR POR total DESCENDENTE`),

  b31: prog(`SELECCIONAR vendedor, SUMAR (monto) COMO total
DE ventas
AGRUPAR POR vendedor
TENIENDO SUMAR (monto) > 30000
ORDENAR POR vendedor`),

  b32: prog(`CREAR TABLA ciudades (id ENTERO CLAVE PRIMARIA, nombre TEXTO)
CREAR TABLA gente (
   id     ENTERO CLAVE PRIMARIA,
   nombre TEXTO,
   ciudad ENTERO REFERENCIA ciudades (id)
)`),

  b33: prog(`SELECCIONAR cl.nombre COMO cliente, ci.nombre COMO ciudad
DE clientes COMO cl
UNIR ciudades COMO ci SEGUN cl.ciudad = ci.id
ORDENAR POR cliente`),

  b34: prog(`SELECCIONAR cl.nombre COMO cliente, ci.nombre COMO ciudad
DE clientes COMO cl
IZQUIERDA UNIR ciudades COMO ci SEGUN cl.ciudad = ci.id
ORDENAR POR cliente`),

  b35: prog(`SELECCIONAR cl.nombre COMO cliente, ci.nombre COMO ciudad, p.monto COMO monto
DE clientes COMO cl
UNIR ciudades COMO ci SEGUN cl.ciudad = ci.id
UNIR compras COMO p SEGUN p.cliente = cl.id
ORDENAR POR cliente, monto`),

  b36: prog(`SELECCIONAR ci.nombre COMO ciudad, SUMAR (p.monto) COMO total
DE compras COMO p
UNIR clientes COMO cl SEGUN p.cliente = cl.id
UNIR ciudades COMO ci SEGUN cl.ciudad = ci.id
AGRUPAR POR ci.nombre
ORDENAR POR total DESCENDENTE`),

  b37: `var
   corte : numerico
inicio
   corte = 7
   SELECCIONAR nombre DE alumnos DONDE nota >= @corte ORDENAR POR nombre
fin
`,

  b38: prog(`SELECCIONAR nombre
DE alumnos
DONDE nota > (SELECCIONAR PROMEDIO (nota) DE alumnos)
ORDENAR POR nombre`),

  b39: prog(`SELECCIONAR nombre
DE clientes
DONDE id EN (SELECCIONAR cliente DE compras)
ORDENAR POR nombre`),

  b40: prog(`SELECCIONAR t.vendedor, t.total
DE (SELECCIONAR vendedor, SUMAR (monto) COMO total
    DE ventas
    AGRUPAR POR vendedor) COMO t
DONDE t.total > 30000
ORDENAR POR t.vendedor`),

  b41: prog(`SELECCIONAR c.nombre,
           (SELECCIONAR SUMAR (p.monto) DE compras COMO p DONDE p.cliente = c.id) COMO total
DE clientes COMO c
ORDENAR POR c.nombre`),

  b42: prog(`SELECCIONAR c.nombre
DE clientes COMO c
DONDE EXISTE (SELECCIONAR 1 DE compras COMO p DONDE p.cliente = c.id)
ORDENAR POR c.nombre`),

  b43: prog(`SELECCIONAR c.nombre
DE clientes COMO c
DONDE NO EXISTE (SELECCIONAR 1 DE compras COMO p DONDE p.cliente = c.id)
ORDENAR POR c.nombre`),

  b44: prog(`SELECCIONAR nombre
DE clientes
DONDE id NO EN (SELECCIONAR cliente DE compras DONDE cliente ES NO NULO)
ORDENAR POR nombre`),

  b45: prog(`SELECCIONAR c.nombre,
           (SELECCIONAR MAXIMO (p.monto) DE compras COMO p DONDE p.cliente = c.id) COMO mayor
DE clientes COMO c
DONDE EXISTE (SELECCIONAR 1 DE compras COMO p DONDE p.cliente = c.id)
ORDENAR POR c.nombre`),

  b46: prog(`SELECCIONAR c.nombre, t.total
DE (SELECCIONAR cliente, SUMAR (monto) COMO total
    DE compras
    AGRUPAR POR cliente) COMO t
UNIR clientes COMO c SEGUN t.cliente = c.id
DONDE t.total > (SELECCIONAR PROMEDIO (monto) DE compras)
ORDENAR POR c.nombre`),

  b47: prog(`SELECCIONAR vendedor, SUMAR (monto) COMO total
DE ventas
AGRUPAR POR vendedor
TENIENDO SUMAR (monto) > (SELECCIONAR PROMEDIO (monto) DE ventas)
ORDENAR POR vendedor`),

  b48: prog(`ACTUALIZAR clientes CONJUNTO ciudad = 3
DONDE id EN (SELECCIONAR cliente DE compras DONDE cliente ES NO NULO)
SELECCIONAR nombre, ciudad DE clientes ORDENAR POR nombre`),

  b49: prog(`SELECCIONAR t.ciudad
DE (SELECCIONAR ci.nombre COMO ciudad, SUMAR (p.monto) COMO total
    DE compras COMO p
    UNIR clientes COMO cl SEGUN p.cliente = cl.id
    UNIR ciudades COMO ci SEGUN cl.ciudad = ci.id
    AGRUPAR POR ci.nombre) COMO t
DONDE t.total = (SELECCIONAR MAXIMO (u.total)
                 DE (SELECCIONAR ci.nombre COMO ciudad, SUMAR (p.monto) COMO total
                     DE compras COMO p
                     UNIR clientes COMO cl SEGUN p.cliente = cl.id
                     UNIR ciudades COMO ci SEGUN cl.ciudad = ci.id
                     AGRUPAR POR ci.nombre) COMO u)`),

  b50: prog(`SELECCIONAR c.nombre,
           ci.nombre COMO ciudad,
           CONTAR (p.id) COMO compras,
           SI_NULO (SUMAR (p.monto), 0) COMO total
DE clientes COMO c
IZQUIERDA UNIR ciudades COMO ci SEGUN c.ciudad = ci.id
IZQUIERDA UNIR compras COMO p SEGUN p.cliente = c.id
AGRUPAR POR c.nombre, ci.nombre
ORDENAR POR total DESCENDENTE, c.nombre`)
};
