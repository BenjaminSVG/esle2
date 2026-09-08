/*
 * Soluciones de referencia de los ejercicios del curso de SLE2.
 * Las usan test/test-sle2.js (para verificar que resuelven cada caso) y
 * test/test-estilo.js (para que el revisor de estilo no las moleste).
 */
'use strict';

module.exports = {
  f1: `inicio
   imprimir ("Hola, mundo!")
fin`,

  f2: `var
   a, b : numerico
inicio
   leer (a, b)
   imprimir (a + b)
fin`,

  f3: `var
   base, altura : numerico
inicio
   leer (base, altura)
   imprimir (base * altura)
fin`,

  f4: `var
   n : numerico
inicio
   leer (n)
   si ( n % 2 == 0 )
   {
      imprimir ("par")
   sino
      imprimir ("impar")
   }
fin`,

  f5: `var
   a, b, c, may : numerico
inicio
   leer (a, b, c)
   may = a
   si ( b > may ) { may = b }
   si ( c > may ) { may = c }
   imprimir (may)
fin`,

  f6: `var
   n, k : numerico
inicio
   leer (n)
   desde k=1 hasta 10
   {
      imprimir ("\\n", n, " x ", k, " = ", n*k)
   }
fin`,

  f7: `var
   c, f : numerico
inicio
   leer (c)
   imprimir (c * 9 / 5 + 32)
fin`,

  f8: `const
   PI = 3.141592654
var
   r : numerico
inicio
   leer (r)
   imprimir (str (2 * PI * r, 0, 2), "\\n", str (PI * r * r, 0, 2))
fin`,

  f9: `var
   n, k : numerico
inicio
   leer (n)
   desde k=n hasta 1 paso -1
   {
      imprimir ("\\n", k)
   }
fin`,

  f10: `var
   n : numerico
inicio
   leer (n)
   eval
   {
      caso ( n > 0 )   imprimir ("positivo")
      caso ( n < 0 )   imprimir ("negativo")
      sino             imprimir ("cero")
   }
fin`,

  f11: `var
   a = 0
inicio
   leer (a)
   si ( (a % 4 == 0 && a % 100 <> 0) || a % 400 == 0 )
   {
      imprimir ("bisiesto")
   sino
      imprimir ("comun")
   }
fin`,

  f12: `var
   a = 0
   b = 0
   c = 0
inicio
   leer (a, b, c)
   imprimir (max (max (a, b), c), "\\n", min (min (a, b), c))
fin`,

  m12: `var
   n = 0
inicio
   leer (n)
   imprimir (n, " es ", ifval (n % 2 == 0, "par", "impar"))
fin`,

  m13: `var
   v : vector [*] numerico
   n = 0
   k = 0
inicio
   leer (n)
   dim (v, n)
   leer (v)
   desde k=1 hasta int (n/2)
   {
      intercambiar (v [k], v [n-k+1])
   }
   imprimir (v)
fin`,

  m14: `var
   v : vector [*] cadena
   n = 0
   k = 0
inicio
   leer (n)
   dim (v, n)
   desde k=1 hasta n
   {
      leer (v [k])
   }
   set_ofs ("-")
   imprimir (v)
fin`,

  m15: `tipos
   PERSONA : registro
   {
      nombre : cadena
      edad   : numerico
      ciudad : cadena
   }
var
   p : PERSONA
inicio
   leer (p)
   imprimir (p.nombre, " (", p.edad, ") - ", p.ciudad)
fin`,

  m1: `var
   n, k, f : numerico
inicio
   leer (n)
   f = 1
   desde k=2 hasta n
   {
      f = f * k
   }
   imprimir (f)
fin`,

  m2: `var
   n, s : numerico
inicio
   leer (n)
   s = 0
   repetir
      s = s + n % 10
      n = int (n / 10)
   hasta ( n == 0 )
   imprimir (s)
fin`,

  m3: `var
   s : cadena
   k, c : numerico
inicio
   leer (s)
   s = lower (s)
   c = 0
   desde k=1 hasta strlen (s)
   {
      si ( pos ("aeiou", s[k]) > 0 )
      {
         c = c + 1
      }
   }
   imprimir (c)
fin`,

  m4: `var
   s, r : cadena
   k : numerico
inicio
   leer (s)
   desde k=strlen (s) hasta 1 paso -1
   {
      r = r + s[k]
   }
   imprimir (r)
fin`,

  m5: `var
   n, a, b, c : numerico
inicio
   leer (n)
   a = 0
   b = 1
   si ( n >= 1 ) { imprimir ("\\n", a) }
   si ( n >= 2 ) { imprimir ("\\n", b) }
   n = n - 2
   mientras ( n >= 1 )
   {
      c = a + b
      imprimir ("\\n", c)
      a = b
      b = c
      n = n - 1
   }
fin`,

  m6: `var
   notas : vector [*] numerico
   n, k, suma : numerico
inicio
   leer (n)
   dim (notas, n)
   desde k=1 hasta n
   {
      leer (notas [k])
      suma = suma + notas [k]
   }
   imprimir (suma / n)
fin`,

  m7: `var
   s : cadena
   k, c : numerico
inicio
   leer (s)
   c = 1
   desde k=1 hasta strlen (s)
   {
      si ( s[k] == ' ' )
      {
         c = c + 1
      }
   }
   imprimir (c)
fin`,

  m8: `var
   a, b, resto : numerico
inicio
   leer (a, b)
   mientras ( b <> 0 )
   {
      resto = a % b
      a = b
      b = resto
   }
   imprimir (a)
fin`,

  m9: `var
   v : vector [*] numerico
   n, k, may, men : numerico
inicio
   leer (n)
   dim (v, n)
   desde k=1 hasta n
   {
      leer (v [k])
   }
   may = v [1]
   men = v [1]
   desde k=2 hasta n
   {
      si ( v[k] > may ) { may = v[k] }
      si ( v[k] < men ) { men = v[k] }
   }
   imprimir (may, "\\n", men)
fin`,

  m10: `var
   base, exp, k, r : numerico
inicio
   leer (base, exp)
   r = 1
   desde k=1 hasta exp
   {
      r = r * base
   }
   imprimir (r)
fin`,

  m11: `var
   t, h, m, s : numerico
inicio
   leer (t)
   h = int (t / 3600)
   m = int ((t % 3600) / 60)
   s = t % 60
   imprimir (str (h, 2, 0, "0"), ":", str (m, 2, 0, "0"), ":", str (s, 2, 0, "0"))
fin`,

  a1: `var
   n, k : numerico
inicio
   leer (n)
   desde k=2 hasta n
   {
      si ( es_primo (k) )
      {
         imprimir ("\\n", k)
      }
   }
fin

subrutina es_primo (x : numerico) retorna logico
var
   d : numerico
inicio
   si ( x < 2 ) { retorna ( FALSE ) }
   desde d=2 hasta int (sqrt (x))
   {
      si ( x % d == 0 )
      {
         retorna ( FALSE )
      }
   }
   retorna ( TRUE )
fin`,

  a2: `var
   v : vector [*] numerico
   n, k, j, aux : numerico
inicio
   leer (n)
   dim (v, n)
   desde k=1 hasta n
   {
      leer (v [k])
   }
   desde k=1 hasta n-1
   {
      desde j=k+1 hasta n
      {
         si ( v [j] < v [k] )
         {
            aux = v [k]
            v [k] = v [j]
            v [j] = aux
         }
      }
   }
   desde k=1 hasta n
   {
      imprimir ("\\n", v [k])
   }
fin`,

  a3: `var
   n : numerico
   s : cadena
inicio
   leer (n)
   repetir
      s = str (n % 2, 0, 0) + s
      n = int (n / 2)
   hasta ( n == 0 )
   imprimir (s)
fin`,

  a4: `var
   s : cadena
   k, g : numerico
   ok : logico
inicio
   leer (s)
   ok = TRUE
   g = strlen (s)
   desde k=1 hasta int (g / 2)
   {
      si ( s[k] <> s[g-k+1] )
      {
         ok = FALSE
      }
   }
   si ( ok )
   {
      imprimir ("SI")
   sino
      imprimir ("NO")
   }
fin`,

  a5: `var
   m, t : matriz [*,*] numerico
   f, c, i, j : numerico
inicio
   leer (f, c)
   dim (m, f, c)
   dim (t, c, f)
   desde i=1 hasta f
   {
      desde j=1 hasta c
      {
         leer (m [i, j])
      }
   }
   desde i=1 hasta c
   {
      desde j=1 hasta f
      {
         t [i, j] = m [j, i]
         imprimir (t [i, j], " ")
      }
      imprimir ("\\n")
   }
fin`
,

  a6: `var
   v : vector [*] numerico
   n, k, buscado, izq, der, medio, pos : numerico
inicio
   leer (n)
   dim (v, n)
   desde k=1 hasta n
   {
      leer (v [k])
   }
   leer (buscado)
   izq = 1
   der = n
   pos = 0
   mientras ( izq <= der and pos == 0 )
   {
      medio = int ((izq + der) / 2)
      si ( v [medio] == buscado )
      {
         pos = medio
      sino si ( v [medio] < buscado )
         izq = medio + 1
      sino
         der = medio - 1
      }
   }
   imprimir (pos)
fin`,

  a7: `var
   m1, m2, r : matriz [*,*] numerico
   f1, c1, f2, c2, i, j, k, s : numerico
inicio
   leer (f1, c1)
   dim (m1, f1, c1)
   desde i=1 hasta f1
   {
      desde j=1 hasta c1
      {
         leer (m1 [i, j])
      }
   }
   leer (f2, c2)
   dim (m2, f2, c2)
   desde i=1 hasta f2
   {
      desde j=1 hasta c2
      {
         leer (m2 [i, j])
      }
   }
   dim (r, f1, c2)
   desde i=1 hasta f1
   {
      desde j=1 hasta c2
      {
         s = 0
         desde k=1 hasta c1
         {
            s = s + m1 [i, k] * m2 [k, j]
         }
         r [i, j] = s
         imprimir (r [i, j], " ")
      }
      imprimir ("\\n")
   }
fin`,

  a8: `var
   t : matriz [*,*] numerico
   n, f, c : numerico
inicio
   leer (n)
   dim (t, n, n)
   desde f=1 hasta n
   {
      desde c=1 hasta f
      {
         si ( c == 1 or c == f )
         {
            t [f, c] = 1
         sino
            t [f, c] = t [f-1, c-1] + t [f-1, c]
         }
         imprimir (t [f, c], " ")
      }
      imprimir ("\\n")
   }
fin`,

  a9: `var
   p : vector [*] cadena
   n, k, j : numerico
   aux : cadena
inicio
   leer (n)
   dim (p, n)
   desde k=1 hasta n
   {
      leer (p [k])
   }
   desde k=1 hasta n-1
   {
      desde j=k+1 hasta n
      {
         si ( p [j] < p [k] )
         {
            aux = p [k]
            p [k] = p [j]
            p [j] = aux
         }
      }
   }
   desde k=1 hasta n
   {
      imprimir ("\\n", p [k])
   }
fin`,

  a11: `var
   nombre = ""
   nota = 0
   lista = ""
   n = 0
   k = 0
   cant = 0
inicio
   leer (n)
   set_stdout ("aprobados.txt")
   desde k=1 hasta n
   {
      leer (nombre, nota)
      si ( nota >= 60 )
      {
         imprimir (nombre, "\\n")
      }
   }
   set_stdout ("")
   set_stdin ("aprobados.txt")
   set_ifs ("\\n")
   leer (nombre)
   mientras ( not eof() )
   {
      inc (cant)
      si ( cant == 1 )
      {
         lista = nombre
      sino
         lista = lista + "," + nombre
      }
      leer (nombre)
   }
   imprimir ("aprobados: ", cant)
   si ( cant > 0 )
   {
      imprimir ("\\n", lista)
   }
fin`,

  a12: `var
   F : vector [26] numerico
   pos_A = ord ("A")
   z = ""
   k = 0
inicio
   leer (z)
   F = {0, ...}
   desde k=1 hasta strlen (z)
   {
      inc (F [ord (z[k]) - pos_A + 1])
   }
   desde k=1 hasta 26
   {
      si ( F [k] > 0 )
      {
         imprimir (ascii (pos_A + k - 1), ":", F [k], "\\n")
      }
   }
fin`,

  a10: `var
   s, r : cadena
   d, k : numerico
inicio
   leer (s)
   leer (d)
   desde k=1 hasta strlen (s)
   {
      r = r + ascii ((ord (s[k]) - 97 + d) % 26 + 97)
   }
   imprimir (r)
fin`,

  f13: `var
   precio : numerico
inicio
   leer (precio)
   imprimir (precio * 1.1)
fin`,

  f14: `var
   n, k, suma : numerico
inicio
   leer (n)
   suma = 0
   desde k=1 hasta n
   {
      suma = suma + k
   }
   imprimir (suma)
fin`,

  f15: `var
   t : cadena
inicio
   leer (t)
   imprimir (strlen (t), "\\n", upper (t))
fin`,

  f16: `var
   precio, cant, total : numerico
inicio
   leer (precio, cant)
   total = precio * cant
   si ( cant >= 10 )
   {
      total = total * 0.85
   }
   imprimir (total)
fin`,

  m16: `var
   n, k, j, v : numerico
inicio
   leer (n)
   desde k=1 hasta n
   {
      leer (v)
      imprimir (v, " ")
      desde j=1 hasta v
      {
         imprimir ("*")
      }
      imprimir ("\\n")
   }
fin`,

  m17: `var
   t, c : cadena
   k : numerico
   hay_may, hay_dig : logico
inicio
   leer (t)
   hay_may = FALSE
   hay_dig = FALSE
   desde k=1 hasta strlen (t)
   {
      c = substr (t, k, 1)
      si ( c >= "A" and c <= "Z" )
      {
         hay_may = TRUE
      }
      si ( c >= "0" and c <= "9" )
      {
         hay_dig = TRUE
      }
   }
   si ( strlen (t) < 8 )
   {
      imprimir ("corta")
   sino si ( not hay_may )
      imprimir ("sin mayuscula")
   sino si ( not hay_dig )
      imprimir ("sin digito")
   sino
      imprimir ("segura")
   }
fin`,

  m18: `var
   billetes : vector [6] numerico
   monto, k, cuantos : numerico
inicio
   billetes = {100000, 50000, 20000, 10000, 5000, 2000}
   leer (monto)
   desde k=1 hasta alen (billetes)
   {
      cuantos = int (monto / billetes [k])
      si ( cuantos > 0 )
      {
         imprimir (billetes [k], " x ", cuantos, "\\n")
         monto = monto - cuantos * billetes [k]
      }
   }
   imprimir ("resto ", monto)
fin`,

  a13: `var
   n : numerico
inicio
   leer (n)
   hanoi (n, "A", "C", "B")
   imprimir ("total ", 2 ^ n - 1)
fin

subrutina hanoi (n : numerico; ori, des, aux : cadena)
inicio
   si ( n > 0 )
   {
      hanoi (n - 1, ori, aux, des)
      imprimir (ori, " -> ", des, "\\n")
      hanoi (n - 1, aux, des, ori)
   }
fin`,

  a14: `var
   es : vector [*] logico
   n, k, m, cuantos : numerico
inicio
   leer (n)
   si ( n < 1 )
   {
      n = 1
   }
   dim (es, n)
   desde k=1 hasta n
   {
      es [k] = TRUE
   }
   es [1] = FALSE
   desde k=2 hasta n
   {
      si ( es [k] )
      {
         desde m=k*2 hasta n paso k
         {
            es [m] = FALSE
         }
      }
   }
   cuantos = 0
   desde k=1 hasta n
   {
      si ( es [k] )
      {
         si ( cuantos > 0 )
         {
            imprimir (" ")
         }
         imprimir (k)
         cuantos = cuantos + 1
      }
   }
   si ( cuantos > 0 )
   {
      imprimir ("\\n")
   }
   imprimir ("cantidad ", cuantos)
fin`,

  a15: `var
   m : matriz [*,*] numerico
   n, f, c, suma, diag, mayor : numerico
inicio
   leer (n)
   dim (m, n, n)
   desde f=1 hasta n
   {
      leer (m [f])
   }
   diag = 0
   mayor = m [1, 1]
   desde f=1 hasta n
   {
      suma = 0
      desde c=1 hasta n
      {
         suma = suma + m [f, c]
         mayor = max (mayor, m [f, c])
      }
      imprimir ("fila ", f, ": ", suma, "\\n")
      diag = diag + m [f, f]
   }
   imprimir ("diagonal ", diag, "\\n")
   imprimir ("mayor ", mayor)
fin`,

  a16: `var
   t, palabra, larga, c : cadena
   k, cuantas, letras : numerico
inicio
   leer (t)
   palabra = ""
   larga = ""
   cuantas = 0
   letras = 0
   desde k=1 hasta strlen (t) + 1
   {
      si ( k > strlen (t) )
      {
         c = " "
      sino
         c = substr (t, k, 1)
      }
      si ( c == " " )
      {
         si ( strlen (palabra) > 0 )
         {
            cuantas = cuantas + 1
            letras = letras + strlen (palabra)
            si ( strlen (palabra) > strlen (larga) )
            {
               larga = palabra
            }
            palabra = ""
         }
      sino
         palabra = palabra + c
      }
   }
   imprimir ("palabras ", cuantas, "\\n")
   imprimir ("mas larga: ", larga, "\\n")
   imprimir ("promedio ", str (letras / cuantas, 0, 2))
fin`
};
