/*
 * Traductor de SLE2 a los lenguajes de llaves: C, C++, Java y C#.
 *
 * Son cuatro salidas y un solo traductor. No por ahorrar archivos, sino
 * porque los cuatro comparten TODO lo que tiene chance de estar mal —el
 * orden de un desde, cómo se cierra un repetir, qué operador reemplaza a
 * cada uno de SL, cómo se pasa un parámetro por referencia— y solo se
 * diferencian en cosas de vocabulario: cómo se llama el tipo numérico, cómo
 * se imprime, qué envoltorio pide el archivo. Cuatro traductores separados
 * serían cuatro copias de la misma lógica y cuatro lugares donde arreglar
 * cada error.
 *
 * Lo que se ve en el resultado, y por qué:
 *
 *   · los vectores quedan 1-based: se reserva una casilla de más y la 0 no
 *     se usa. Así A[k] significa lo mismo en los dos lenguajes y el alumno
 *     puede comparar línea contra línea, que es para lo que sirve esto;
 *   · imprimir() escribe directo a la salida estándar;
 *   · leer() consume la constante ENTRADA que queda arriba de todo, que es
 *     lo que en el IDE es el panel «Entrada de datos»;
 *   · un parámetro por referencia se traduce con puntero en C y C++, y con
 *     un arreglo de un elemento en Java y C#, que no tienen punteros. Es el
 *     truco de siempre y queda explicado en un comentario del archivo;
 *   · lo que el traductor no sabe pasar queda anotado como TODO y como
 *     aviso, nunca inventado.
 *
 * En C las cadenas son char* pedidos con malloc y el programa traducido no
 * los libera. Es a propósito: liberarlos bien pediría un dueño para cada
 * cadena y el archivo dejaría de parecerse al programa original, que es todo
 * lo que se quiere mostrar. Va dicho en un comentario del propio archivo
 * para que nadie lo copie a un programa de verdad sin saberlo.
 *
 * API:  TraductorC.traducir(ast, { lenguaje, entrada }) -> { codigo, avisos }
 *       TraductorC.LENGUAJES -> { c, cpp, java, cs }
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Palabras que no se pueden usar como nombre en cada lenguaje          */
  /* ------------------------------------------------------------------ */
  const COMUNES = ['auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
    'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'int', 'long',
    'register', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch',
    'typedef', 'union', 'unsigned', 'void', 'volatile', 'while', 'main'];
  const CPP = COMUNES.concat(['bool', 'catch', 'class', 'delete', 'false', 'friend', 'inline',
    'namespace', 'new', 'operator', 'private', 'protected', 'public', 'template', 'this',
    'throw', 'true', 'try', 'using', 'virtual', 'std', 'string']);
  const JAVA = ['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
    'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends',
    'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof',
    'int', 'interface', 'long', 'native', 'new', 'null', 'package', 'private', 'protected',
    'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized',
    'this', 'throw', 'throws', 'transient', 'true', 'false', 'try', 'void', 'volatile',
    'while', 'var', 'record', 'String', 'System', 'Math', 'main'];
  const CS = JAVA.concat(['as', 'base', 'bool', 'checked', 'decimal', 'delegate', 'event',
    'explicit', 'fixed', 'foreach', 'implicit', 'in', 'internal', 'is', 'lock', 'namespace',
    'object', 'operator', 'out', 'override', 'params', 'readonly', 'ref', 'sbyte', 'sealed',
    'sizeof', 'stackalloc', 'string', 'struct', 'typeof', 'uint', 'ulong', 'unchecked',
    'unsafe', 'ushort', 'using', 'virtual', 'Console', 'Program']);

  /* ------------------------------------------------------------------ */
  /* Un descriptor por lenguaje                                          */
  /* ------------------------------------------------------------------ */
  const LENGUAJES = {
    c: {
      nombre: 'C', archivo: 'programa.c', corre: 'gcc programa.c -o programa && ./programa',
      reservadas: COMUNES, ext: '.c',
      tipos: { num: 'double', cad: 'char*', log: 'int' },
      vacio: 'void', verdadero: '1', falso: '0', yy: '&&', oo: '||', no: '!',
      cabecera: [
        '#include <stdio.h>', '#include <stdlib.h>', '#include <string.h>',
        '#include <math.h>', '#include <time.h>'
      ],
      /* En C no hay bool, así que un lógico es un int: se imprime como TRUE
         o FALSE igual que en SL, no como 1 y 0. */
      imprimirNum: 'printf("%s", _num(%V));',
      imprimirCad: 'printf("%s", %V);',
      imprimirLog: 'printf("%s", (%V) ? "TRUE" : "FALSE");',
      concat: '_cat(%A, %B)',
      igualCad: '(strcmp(%A, %B) == 0)', cmpCad: '(strcmp(%A, %B) %O 0)',
      nuevoVector: '(%T*) _vector(%N, sizeof(%T))',
      vectorTipo: '%T*',
      cadenaVacia: '_dup("")',
      estructura: 'struct'
    },
    cpp: {
      nombre: 'C++', archivo: 'programa.cpp', corre: 'g++ programa.cpp -o programa && ./programa',
      reservadas: CPP, ext: '.cpp',
      tipos: { num: 'double', cad: 'std::string', log: 'bool' },
      vacio: 'void', verdadero: 'true', falso: 'false', yy: '&&', oo: '||', no: '!',
      cabecera: [
        '#include <iostream>', '#include <string>', '#include <vector>',
        '#include <sstream>', '#include <iomanip>', '#include <cmath>',
        '#include <cstdlib>', '#include <ctime>'
      ],
      imprimirNum: 'std::cout << _num(%V);',
      imprimirCad: 'std::cout << %V;',
      imprimirLog: 'std::cout << ((%V) ? "TRUE" : "FALSE");',
      concat: '(%A + %B)',
      nuevoVector: 'std::vector<%T>(%N + 1%D)',
      vectorTipo: 'std::vector<%T>',
      cadenaVacia: '""',
      estructura: 'struct'
    },
    java: {
      nombre: 'Java', archivo: 'Programa.java', corre: 'javac Programa.java && java Programa',
      reservadas: JAVA, ext: '.java',
      tipos: { num: 'double', cad: 'String', log: 'boolean' },
      vacio: 'void', verdadero: 'true', falso: 'false', yy: '&&', oo: '||', no: '!',
      cabecera: [],
      imprimirNum: 'System.out.print(_num(%V));',
      imprimirCad: 'System.out.print(%V);',
      imprimirLog: 'System.out.print((%V) ? "TRUE" : "FALSE");',
      concat: '(%A + %B)',
      igualCad: '%A.equals(%B)', cmpCad: '(%A.compareTo(%B) %O 0)',
      nuevoVector: 'new %T[%N + 1]',
      vectorTipo: '%T[]',
      cadenaVacia: '""',
      clase: 'Programa', estructura: 'static class'
    },
    cs: {
      nombre: 'C#', archivo: 'Programa.cs', corre: 'dotnet run',
      reservadas: CS, ext: '.cs',
      tipos: { num: 'double', cad: 'string', log: 'bool' },
      vacio: 'void', verdadero: 'true', falso: 'false', yy: '&&', oo: '||', no: '!',
      cabecera: ['using System;'],
      imprimirNum: 'Console.Write(_num(%V));',
      imprimirCad: 'Console.Write(%V);',
      imprimirLog: 'Console.Write((%V) ? "TRUE" : "FALSE");',
      concat: '(%A + %B)',
      cmpCad: '(string.Compare(%A, %B, StringComparison.Ordinal) %O 0)',
      nuevoVector: 'new %T[%N + 1]',
      vectorTipo: '%T[]',
      cadenaVacia: '""',
      clase: 'Programa', estructura: 'class'
    }
  };

  /* ------------------------------------------------------------------ */
  /* Las ayudas: una copia de cada subrutina de SL que haga falta         */
  /* ------------------------------------------------------------------ */
  const AYUDAS = {
    c: {
      /* SL imprime un número entero sin decimales y uno con decimales con 12
         cifras significativas. Copiar esa regla es lo único que hace que la
         traducción diga exactamente lo mismo que el original. */
      num: `static char _numbuf[64];
static const char* _num(double v) {
  if (v == (long long) v) { sprintf(_numbuf, "%lld", (long long) v); return _numbuf; }
  sprintf(_numbuf, "%.12g", v);
  return _numbuf;
}`,
      dup: `static char* _dup(const char* s) { char* r = (char*) malloc(strlen(s) + 1); strcpy(r, s); return r; }`,
      cat: `static char* _cat(const char* a, const char* b) {
  char* r = (char*) malloc(strlen(a) + strlen(b) + 1);
  strcpy(r, a); strcat(r, b); return r;
}`,
      vector: `/* Los vectores de SL empiezan en 1: se pide una casilla de más y la 0 no se usa. */
static void* _vector(int n, size_t tam) { return calloc(n + 1, tam); }`,
      leer: `static int _linea = 0;
static const char* _leerLinea(void) { return _linea < _ENTRADA_N ? ENTRADA[_linea++] : ""; }
static char _campos[512]; static char* _resto = NULL;
static const char* _leerCampo(void) {
  if (_resto == NULL || *_resto == '\\0') { strncpy(_campos, _leerLinea(), 511); _campos[511] = '\\0'; _resto = _campos; }
  char* ini = _resto;
  char* coma = strchr(_resto, ',');
  if (coma) { *coma = '\\0'; _resto = coma + 1; } else { _resto += strlen(_resto); }
  while (*ini == ' ') ini++;
  return ini;
}
static double _leerNumero(void) { return atof(_leerCampo()); }
static char* _leerTexto(void) { return _dup(_leerCampo()); }`,
      /* str(n [, ancho [, decimales [, relleno]]]): dos decimales por omisión,
         no el número "a secas". Es la regla de SL y se copia tal cual. */
      str: `static char* _str(double v, int anc, int dec, char rel) {
  char buf[128]; char out[160];
  sprintf(buf, "%.*f", dec < 0 ? 0 : dec, v);
  int n = (int) strlen(buf), i = 0;
  while (n + i < anc && i < 128) { out[i] = rel; i++; }
  strcpy(out + i, buf);
  return _dup(out);
}`,
      val: `static double _val(const char* s) { return atof(s); }`,
      substr: `static char* _substr(const char* s, int desde, int cuantos) {
  int n = (int) strlen(s);
  if (desde < 1) desde = 1;
  if (desde > n) return _dup("");
  if (cuantos < 0 || desde - 1 + cuantos > n) cuantos = n - desde + 1;
  char* r = (char*) malloc(cuantos + 1);
  memcpy(r, s + desde - 1, cuantos); r[cuantos] = '\\0';
  return r;
}`,
      pos: `static double _pos(const char* s, const char* q) { const char* p = strstr(s, q); return p ? (double)(p - s + 1) : 0; }`,
      caso: `static char* _upper(const char* s) { char* r = _dup(s); for (char* p = r; *p; p++) *p = (char) toupper((unsigned char) *p); return r; }
static char* _lower(const char* s) { char* r = _dup(s); for (char* p = r; *p; p++) *p = (char) tolower((unsigned char) *p); return r; }`,
      strdup: `static char* _strdupn(const char* s, int n) {
  int len = (int) strlen(s); char* r = (char*) malloc(len * (n < 0 ? 0 : n) + 1); r[0] = '\\0';
  for (int i = 0; i < n; i++) strcat(r, s);
  return r;
}`,
      random: `static double _random(double n) { return (double)(rand() % (n < 1 ? 1 : (int) n)); }`
    },
    cpp: {
      /* SL imprime un entero sin decimales y lo demás con 12 cifras
         significativas: copiar esa regla es lo que hace que la traducción diga
         exactamente lo mismo. */
      num: `static std::string _num(double v) {
  std::ostringstream o;
  if (v == (long long) v) { o << (long long) v; return o.str(); }
  o << std::setprecision(12) << v;
  return o.str();
}`,
      vector: `// Los vectores de SL empiezan en 1: se pide una casilla de más y la 0 no se usa.`,
      leer: `static size_t _linea = 0;
static std::string _leerLinea() { return _linea < ENTRADA.size() ? ENTRADA[_linea++] : std::string(""); }
static std::string _resto; static bool _hayResto = false;
static std::string _leerCampo() {
  if (!_hayResto || _resto.empty()) { _resto = _leerLinea(); _hayResto = true; }
  size_t coma = _resto.find(',');
  std::string campo = coma == std::string::npos ? _resto : _resto.substr(0, coma);
  _resto = coma == std::string::npos ? std::string("") : _resto.substr(coma + 1);
  size_t i = campo.find_first_not_of(" \\t");
  return i == std::string::npos ? std::string("") : campo.substr(i);
}
static double _leerNumero() { return atof(_leerCampo().c_str()); }
static std::string _leerTexto() { return _leerCampo(); }`,
      str: `static std::string _str(double v, int anc, int dec, char rel) {
  std::ostringstream o;
  o << std::fixed << std::setprecision(dec < 0 ? 0 : dec) << v;
  std::string s = o.str();
  while ((int) s.size() < anc) s = std::string(1, rel) + s;
  return s;
}`,
      val: `static double _val(const std::string& s) { return atof(s.c_str()); }`,
      substr: `static std::string _substr(const std::string& s, int desde, int cuantos) {
  int n = (int) s.size();
  if (desde < 1) desde = 1;
  if (desde > n) return "";
  if (cuantos < 0 || desde - 1 + cuantos > n) cuantos = n - desde + 1;
  return s.substr(desde - 1, cuantos);
}`,
      pos: `static double _pos(const std::string& s, const std::string& q) { size_t p = s.find(q); return p == std::string::npos ? 0 : (double)(p + 1); }`,
      caso: `static std::string _upper(std::string s) { for (auto& c : s) c = (char) toupper((unsigned char) c); return s; }
static std::string _lower(std::string s) { for (auto& c : s) c = (char) tolower((unsigned char) c); return s; }`,
      strdup: `static std::string _strdupn(const std::string& s, int n) { std::string r; for (int i = 0; i < n; i++) r += s; return r; }`,
      random: `static double _random(double n) { return (double)(rand() % (n < 1 ? 1 : (int) n)); }`
    },
    java: {
      /* SL imprime un entero sin decimales y lo demás con 12 cifras
         significativas: copiar esa regla es lo que hace que la traducción diga
         exactamente lo mismo. */
      num: `static String _num(double v) {
  if (Double.isInfinite(v)) return v > 0 ? "infinito" : "-infinito";
  if (Double.isNaN(v)) return "indefinido";
  if (v == Math.rint(v)) return String.valueOf((long) v);
  double r = Double.parseDouble(String.format(java.util.Locale.ROOT, "%.12g", v));
  if (r == Math.rint(r)) return String.valueOf((long) r);
  return String.valueOf(r);
}`,
      vector: `// Los vectores de SL empiezan en 1: se pide una casilla de más y la 0 no se usa.
static String[] _cadenas(int n) { String[] v = new String[n + 1]; java.util.Arrays.fill(v, ""); return v; }`,
      leer: `static int _linea = 0;
static String _leerLinea() { return _linea < ENTRADA.length ? ENTRADA[_linea++] : ""; }
static java.util.ArrayDeque<String> _campos = new java.util.ArrayDeque<>();
static String _leerCampo() {
  if (_campos.isEmpty()) for (String c : _leerLinea().split(",", -1)) _campos.add(c);
  String c = _campos.poll();
  return c == null ? "" : c.trim();
}
static double _leerNumero() { return _val(_leerCampo()); }
static String _leerTexto() { return _leerCampo(); }`,
      str: `static String _str(double v, int anc, int dec, char rel) {
  String s = String.format(java.util.Locale.ROOT, "%." + (dec < 0 ? 0 : dec) + "f", v);
  StringBuilder b = new StringBuilder();
  for (int i = s.length(); i < anc; i++) b.append(rel);
  return b.append(s).toString();
}`,
      val: `static double _val(String s) { try { return Double.parseDouble(s.trim()); } catch (Exception e) { return 0; } }`,
      substr: `static String _substr(String s, int desde, int cuantos) {
  int n = s.length();
  if (desde < 1) desde = 1;
  if (desde > n) return "";
  if (cuantos < 0 || desde - 1 + cuantos > n) cuantos = n - desde + 1;
  return s.substring(desde - 1, desde - 1 + cuantos);
}`,
      pos: `static double _pos(String s, String q) { return s.indexOf(q) + 1; }`,
      strdup: `static String _strdupn(String s, int n) { StringBuilder b = new StringBuilder(); for (int i = 0; i < n; i++) b.append(s); return b.toString(); }`,
      random: `static java.util.Random _rnd = new java.util.Random();
static double _random(double n) { return _rnd.nextInt(n < 1 ? 1 : (int) n); }`,
      terminar: `static class _Terminado extends RuntimeException { }`
    },
    cs: {
      /* SL imprime un entero sin decimales y lo demás con 12 cifras
         significativas: copiar esa regla es lo que hace que la traducción diga
         exactamente lo mismo. */
      num: `static string _num(double v) {
  var inv = System.Globalization.CultureInfo.InvariantCulture;
  if (double.IsInfinity(v)) return v > 0 ? "infinito" : "-infinito";
  if (double.IsNaN(v)) return "indefinido";
  if (v == Math.Truncate(v)) return ((long) v).ToString(inv);
  double r = double.Parse(v.ToString("G12", inv), System.Globalization.NumberStyles.Any, inv);
  if (r == Math.Truncate(r)) return ((long) r).ToString(inv);
  return r.ToString("R", inv);
}`,
      vector: `// Los vectores de SL empiezan en 1: se pide una casilla de más y la 0 no se usa.
static string[] _cadenas(int n) { var v = new string[n + 1]; for (int i = 0; i <= n; i++) v[i] = ""; return v; }`,
      leer: `static int _linea = 0;
static string _leerLinea() { return _linea < ENTRADA.Length ? ENTRADA[_linea++] : ""; }
static Queue<string> _campos = new Queue<string>();
static string _leerCampo() {
  if (_campos.Count == 0) foreach (var c in _leerLinea().Split(',')) _campos.Enqueue(c);
  return _campos.Count > 0 ? _campos.Dequeue().Trim() : "";
}
static double _leerNumero() { return _val(_leerCampo()); }
static string _leerTexto() { return _leerCampo(); }`,
      str: `static string _str(double v, int anc, int dec, char rel) {
  string s = v.ToString("F" + (dec < 0 ? 0 : dec), System.Globalization.CultureInfo.InvariantCulture);
  return s.PadLeft(anc, rel);
}`,
      val: `static double _val(string s) { double d; return double.TryParse(s.Trim(), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out d) ? d : 0; }`,
      substr: `static string _substr(string s, int desde, int cuantos) {
  int n = s.Length;
  if (desde < 1) desde = 1;
  if (desde > n) return "";
  if (cuantos < 0 || desde - 1 + cuantos > n) cuantos = n - desde + 1;
  return s.Substring(desde - 1, cuantos);
}`,
      pos: `static double _pos(string s, string q) { return s.IndexOf(q, StringComparison.Ordinal) + 1; }`,
      strdup: `static string _strdupn(string s, int n) { var b = new System.Text.StringBuilder(); for (int i = 0; i < n; i++) b.Append(s); return b.ToString(); }`,
      random: `static Random _rnd = new Random();
static double _random(double n) { return _rnd.Next(n < 1 ? 1 : (int) n); }`,
      terminar: `class _Terminado : Exception { }`
    }
  };

  /* Orden estable en el que salen las ayudas. */
  const ORDEN = ['num', 'dup', 'cat', 'vector', 'leer', 'str', 'val', 'substr', 'pos',
    'caso', 'strdup', 'random', 'terminar'];

  /* ------------------------------------------------------------------ */
  function traducir(ast, opciones) {
    const opts = opciones || {};
    const L = LENGUAJES[opts.lenguaje] || LENGUAJES.java;
    const A = AYUDAS[opts.lenguaje] || AYUDAS.java;
    const esC = opts.lenguaje === 'c';
    const esCpp = opts.lenguaje === 'cpp';
    const esJava = opts.lenguaje === 'java';
    const esCs = opts.lenguaje === 'cs';
    const conClase = esJava || esCs;

    const avisos = [];
    const ayudas = new Set();
    const tipos = new Map();
    const subs = new Map();
    let ambito = new Map();
    let refs = new Set();            // parámetros por referencia de tipo simple

    const reservadas = new Set(L.reservadas);
    const aviso = (linea, texto) => { avisos.push({ linea, texto }); return `/* TODO: ${texto} */`; };
    const nombre = n => (reservadas.has(n) ? '_' + n : n);
    const usa = a => { if (A[a]) ayudas.add(a); };

    /* --------------------------- tipos --------------------------- */
    function resolver(spec) {
      if (!spec) return null;
      if (spec.k === 'nombre' || (!spec.k && spec.nombre)) return resolver(tipos.get(spec.nombre));
      if (spec.k && !['num', 'cad', 'log', 'arr', 'rec'].includes(spec.k)) return resolver(tipos.get(spec.k));
      return spec;
    }
    const camposDe = t => (t.campos || []).flatMap(c => (c.nombres || [c.nombre]).map(n => ({ nombre: n, tipo: c.tipo })));
    const esCadena = spec => { const t = resolver(spec); return !!t && t.k === 'cad'; };

    /* El nombre del tipo tal como se escribe en el lenguaje destino. */
    function tipoTexto(spec) {
      const t = resolver(spec);
      if (!t) return L.tipos.num;
      if (t.k === 'num' || t.k === 'cad' || t.k === 'log') return L.tipos[t.k];
      if (t.k === 'rec') return nombreDeRegistro(spec, t);
      if (t.k === 'arr') {
        const dentro = t.dims.length > 1
          ? tipoTexto({ k: 'arr', dims: t.dims.slice(1), elem: t.elem })
          : tipoTexto(t.elem);
        return L.vectorTipo.replace('%T', dentro);
      }
      return L.tipos.num;
    }

    /* Los registros se declaran una sola vez arriba, con su nombre. Si el
       registro es anónimo (declarado dentro de un var) se le inventa uno,
       porque en estos lenguajes un struct necesita nombre. */
    const registros = [];
    const nombresRec = new Map();
    function nombreDeRegistro(spec, t) {
      if (spec && spec.nombre && tipos.has(spec.nombre)) return nombre(spec.nombre);
      if (nombresRec.has(t)) return nombresRec.get(t);
      const n = 'Registro' + (registros.length + 1);
      nombresRec.set(t, n);
      registros.push({ nombre: n, tipo: t });
      return n;
    }

    function porDefecto(spec) {
      const t = resolver(spec);
      if (!t) return '0';
      if (t.k === 'cad') return esC ? (usa('dup'), L.cadenaVacia) : L.cadenaVacia;
      if (t.k === 'log') return L.falso;
      if (t.k === 'num') return '0';
      if (t.k === 'rec') {
        const n = nombreDeRegistro(spec, t);
        return esC || esCpp ? `(${L.estructura === 'struct' ? '' : ''}${n}) {0}` : `new ${n}()`;
      }
      if (t.k === 'arr') {
        usa('vector');
        const dims = t.dims || [];
        if (dims[0] === '*') return esCpp ? `${tipoTexto(spec)}()` : (esC ? 'NULL' : 'null');
        const dentroSpec = dims.length > 1 ? { k: 'arr', dims: dims.slice(1), elem: t.elem } : t.elem;
        const dentro = tipoTexto(dentroSpec);
        const n = dimTexto(dims[0]);
        if (esCpp) {
          const relleno = dims.length > 1 || !esCadena(t.elem) ? '' : '';
          return L.nuevoVector.replace('%T', dentro).replace('%N', n).replace('%D', relleno);
        }
        if (esC) return L.nuevoVector.replace(/%T/g, dentro).replace('%N', n);
        /* Java y C#: un arreglo de cadenas nace con null en cada casilla, y
           null no es lo mismo que "" — imprimirlo diría «null». */
        if (esCadena(dentroSpec)) return `_cadenas(${n})`;
        let base = L.nuevoVector.replace('%T', dentro.replace(/\[\]$/, '')).replace('%N', n);
        if (dims.length > 1) base = `new ${dentro.replace(/\[\]$/, '')}[${n} + 1][]`;
        return base;
      }
      return '0';
    }
    const dimTexto = d => {
      if (typeof d === 'number') return String(Math.trunc(d));
      if (d && d.t === 'num') return String(Math.trunc(d.v));
      return `(int)(${expr(d)})`;
    };

    const tipoDelLiteral = n => {
      if (!n) return null;
      if (n.t === 'cad') return { k: 'cad' };
      if (n.t === 'num') return { k: 'num' };
      if (n.t === 'id' && ['TRUE', 'FALSE', 'SI', 'NO'].includes(n.nombre)) return { k: 'log' };
      return null;
    };

    /* ---------------------- qué tipo tiene esto ------------------- */
    function tipoDe(n) {
      if (!n) return null;
      if (n.t === 'cad') return { k: 'cad' };
      if (n.t === 'num') return { k: 'num' };
      if (n.t === 'id') {
        if (['TRUE', 'FALSE', 'SI', 'NO'].includes(n.nombre)) return { k: 'log' };
        return resolver(ambito.get(n.nombre));
      }
      if (n.t === 'llamada') {
        const s = subs.get(n.nombre);
        if (s && s.retorna) return resolver(s.retorna);
        if (['str', 'substr', 'upper', 'lower', 'strdup', 'ltrim', 'rtrim', 'trim'].includes(n.nombre)) return { k: 'cad' };
        if (['and', 'or', 'not'].includes(n.nombre)) return { k: 'log' };
        return { k: 'num' };
      }
      if (n.t === 'bin') {
        if (['=', '==', '<>', '!=', '<', '>', '<=', '>=', 'and', 'or'].includes(n.op)) return { k: 'log' };
        if (n.op === '+') {
          const i = resolver(tipoDe(n.i));
          if (i && i.k === 'cad') return { k: 'cad' };
          const d = resolver(tipoDe(n.d));
          if (d && d.k === 'cad') return { k: 'cad' };
        }
        return { k: 'num' };
      }
      if (n.t === 'un') return n.op === 'not' ? { k: 'log' } : { k: 'num' };
      if (n.t === 'indice') {
        const b = resolver(tipoDe(n.base));
        if (!b) return null;
        if (b.k === 'cad') return { k: 'cad' };
        if (b.k !== 'arr') return null;
        return b.dims.length > 1
          ? resolver({ k: 'arr', dims: b.dims.slice(1), elem: b.elem }) : resolver(b.elem);
      }
      if (n.t === 'campo') {
        const b = resolver(tipoDe(n.base));
        const c = b && b.k === 'rec' && camposDe(b).find(x => x.nombre === n.nombre);
        return c ? resolver(c.tipo) : null;
      }
      return null;
    }

    /* ------------------------ expresiones ------------------------ */
    function expr(n) {
      switch (n.t) {
        case 'num': return numeroTexto(n.v);
        case 'cad': return cadenaTexto(n.v);
        case 'id': {
          if (n.nombre === 'TRUE' || n.nombre === 'SI') return L.verdadero;
          if (n.nombre === 'FALSE' || n.nombre === 'NO') return L.falso;
          if (refs.has(n.nombre)) return esC ? `(*${nombre(n.nombre)})` : `${nombre(n.nombre)}[0]`;
          return nombre(n.nombre);
        }
        case 'indice': return `${expr(n.base)}[${indice(n.idx)}]`;
        case 'campo': return `${expr(n.base)}.${nombre(n.nombre)}`;
        case 'un':
          if (n.op === 'not') return `${L.no}(${expr(n.e)})`;
          return `${n.op}(${expr(n.e)})`;
        case 'bin': return binario(n);
        case 'llamada': return llamada(n, false);
        case 'estruct': return aviso(n.linea, 'literal { … }: hay que armarlo campo por campo');
        default: return aviso(n.linea, 'expresión que el traductor no conoce');
      }
    }

    /* Un índice tiene que ser entero: en SL todo número es real. */
    const indice = n => (n.t === 'num' ? String(Math.trunc(n.v)) : `(int)(${expr(n)})`);
    const numeroTexto = v => (Number.isInteger(v) ? String(v) : String(v));
    const cadenaTexto = v => JSON.stringify(String(v));

    function binario(n) {
      const i = expr(n.i), d = expr(n.d);
      const ti = resolver(tipoDe(n.i)), td = resolver(tipoDe(n.d));
      const conCadena = (ti && ti.k === 'cad') || (td && td.k === 'cad');

      if (n.op === 'and') return `(${i} ${L.yy} ${d})`;
      if (n.op === 'or') return `(${i} ${L.oo} ${d})`;
      if (n.op === '^') return esC || esCpp ? `pow(${i}, ${d})` : (esJava ? `Math.pow(${i}, ${d})` : `Math.Pow(${i}, ${d})`);
      if (n.op === '%') return `((double)((long)(${i}) % (long)(${d})))`;

      /* Comparar y concatenar cadenas no se escribe igual en todos lados. */
      if (conCadena) {
        if (n.op === '+') {
          if (esC) usa('cat');
          if (esC && (!ti || ti.k !== 'cad')) { usa('str'); return L.concat.replace('%A', `_str(${i})`).replace('%B', d); }
          if (esC && (!td || td.k !== 'cad')) { usa('str'); return L.concat.replace('%A', i).replace('%B', `_str(${d})`); }
          return L.concat.replace('%A', i).replace('%B', d);
        }
        if (['=', '=='].includes(n.op) && L.igualCad) return L.igualCad.replace('%A', i).replace('%B', d);
        if (['<>', '!='].includes(n.op) && L.igualCad) return `${L.no}${L.igualCad.replace('%A', i).replace('%B', d)}`;
        if (L.cmpCad && ['<', '>', '<=', '>='].includes(n.op))
          return L.cmpCad.replace('%A', i).replace('%B', d).replace('%O', n.op);
        if (L.cmpCad && ['=', '=='].includes(n.op))
          return L.cmpCad.replace('%A', i).replace('%B', d).replace('%O', '==');
        if (L.cmpCad && ['<>', '!='].includes(n.op))
          return L.cmpCad.replace('%A', i).replace('%B', d).replace('%O', '!=');
      }

      const OPS = { '=': '==', '<>': '!=' };
      return `(${i} ${OPS[n.op] || n.op} ${d})`;
    }

    /* ------------------------- llamadas -------------------------- */
    /* Las subrutinas predefinidas de SL que tienen equivalente directo. */
    /* Una función matemática con su nombre en cada lenguaje. */
    const unaria = (enC, enJava, enCs, x) =>
      esC || esCpp ? `${enC}(${x})` : esJava ? `Math.${enJava}(${x})` : `Math.${enCs}(${x})`;
    const dosArgs = (enC, enJava, enCs, x, y, args) => {
      /* max() y min() de SL también comparan cadenas; en C y C++ eso no lo
         hace ninguna función de la biblioteca, así que se escribe a mano. */
      const t = resolver(tipoDe(args[0]));
      if (t && t.k === 'cad') {
        const menor = enC === 'min';
        if (esC) return `(strcmp(${x}, ${y}) ${menor ? '<=' : '>='} 0 ? ${x} : ${y})`;
        if (esCpp) return `((${x} ${menor ? '<=' : '>='} ${y}) ? ${x} : ${y})`;
        if (esJava) return `((${x}).compareTo(${y}) ${menor ? '<=' : '>='} 0 ? ${x} : ${y})`;
        return `(string.Compare(${x}, ${y}, StringComparison.Ordinal) ${menor ? '<=' : '>='} 0 ? ${x} : ${y})`;
      }
      if (esC || esCpp) return `((${x}) ${enC === 'min' ? '<=' : '>='} (${y}) ? (${x}) : (${y}))`;
      return esJava ? `Math.${enJava}(${x}, ${y})` : `Math.${enCs}(${x}, ${y})`;
    };

    function llamada(n, comoSentencia) {
      const args = n.args || [];
      const a = i => (args[i] ? expr(args[i]) : '0');

      switch (n.nombre) {
        case 'imprimir': return imprimir(args, comoSentencia);
        case 'leer': return leer(args);
        case 'cls': return esC ? 'printf("\\033[2J\\033[H")' : esCpp ? 'std::cout << "\\033[2J\\033[H"'
          : esJava ? 'System.out.print("\\033[2J\\033[H")' : 'Console.Clear()';
        case 'str': {
          usa('str'); usa('num');
          const anc = args.length > 1 ? `(int)(${a(1)})` : '0';
          const dec = args.length > 2 ? `(int)(${a(2)})` : '2';
          const rel = args.length > 3 ? `${a(3)}[0]` : "' '";
          const relC = args.length > 3
            ? (esJava ? `${a(3)}.charAt(0)` : esCs ? `${a(3)}[0]` : esCpp ? `${a(3)}[0]` : `${a(3)}[0]`)
            : "' '";
          return `_str(${a(0)}, ${anc}, ${dec}, ${relC})`;
        }
        case 'val': usa('val'); return `_val(${a(0)})`;
        case 'strlen': return esC ? `((double) strlen(${a(0)}))` : esCpp ? `((double) ${a(0)}.size())`
          : esJava ? `((double) ${a(0)}.length())` : `((double) ${a(0)}.Length)`;
        case 'substr': usa('substr'); return `_substr(${a(0)}, (int)(${a(1)}), ${args.length > 2 ? `(int)(${a(2)})` : '-1'})`;
        case 'pos': usa('pos'); return `_pos(${a(0)}, ${a(1)})`;
        case 'upper': if (esC || esCpp) { usa('caso'); return `_upper(${a(0)})`; }
          return esJava ? `${a(0)}.toUpperCase()` : `${a(0)}.ToUpper()`;
        case 'lower': if (esC || esCpp) { usa('caso'); return `_lower(${a(0)})`; }
          return esJava ? `${a(0)}.toLowerCase()` : `${a(0)}.ToLower()`;
        case 'strdup': usa('strdup'); return `_strdupn(${a(0)}, (int)(${a(1)}))`;
        /* Una función matemática se escribe distinto en cada lenguaje: en C y
           C++ va suelta, en Java con Math.minuscula y en C# con Math.Mayuscula. */
        /* Java no tiene Math.trunc: se corta hacia cero pasando por long. */
        case 'int': return esJava ? `((double)((long)(${a(0)})))` : unaria('trunc', 'trunc', 'Truncate', a(0));
        case 'abs': return unaria('fabs', 'abs', 'Abs', a(0));
        case 'sqrt': return unaria('sqrt', 'sqrt', 'Sqrt', a(0));
        case 'sin': return unaria('sin', 'sin', 'Sin', a(0));
        case 'cos': return unaria('cos', 'cos', 'Cos', a(0));
        case 'tan': return unaria('tan', 'tan', 'Tan', a(0));
        case 'arctan': return unaria('atan', 'atan', 'Atan', a(0));
        case 'exp': return unaria('exp', 'exp', 'Exp', a(0));
        /* Ojo: el log() de SL es DECIMAL, no natural. Traducirlo como log()
           de C sería cambiar el resultado sin que nadie se entere. */
        case 'log': return unaria('log10', 'log10', 'Log10', a(0));
        case 'max': return dosArgs('max', 'max', 'Max', a(0), a(1), args);
        case 'min': return dosArgs('min', 'min', 'Min', a(0), a(1), args);
        case 'sec': return esC ? '((double) time(NULL))' : esCpp ? '((double) std::time(nullptr))'
          : esJava ? '((double)(System.currentTimeMillis() / 1000))'
            : '((double) DateTimeOffset.UtcNow.ToUnixTimeSeconds())';
        case 'mem': return '640000';
        /* inc() y dec() devuelven el valor NUEVO, y también sirven como
           sentencia. Se traducen como la asignación compuesta que son. */
        case 'inc': case 'dec': {
          const op = n.nombre === 'inc' ? '+=' : '-=';
          const cuanto = args.length > 1 ? a(1) : '1';
          /* Como sentencia va suelto; como expresión hay que envolverlo,
             porque inc() devuelve el valor nuevo. */
          return comoSentencia
            ? `${destino(args[0])} ${op} ${cuanto};`
            : `(${destino(args[0])} ${op} ${cuanto})`;
        }
        case 'intercambiar': case 'swap': {
          const tA = resolver(tipoDe(args[0]));
          const tipo = tipoTexto(tA || { k: 'num' });
          const s = sangria();
          return ['{', `${s}  ${tipo} _tmp = ${expr(args[0])};`,
            `${s}  ${destino(args[0])} = ${expr(args[1])};`,
            `${s}  ${destino(args[1])} = _tmp;`, `${s}}`].join('\n');
        }
        case 'eof': return esC ? '(_linea >= _ENTRADA_N)' : esCpp ? '(_linea >= ENTRADA.size())'
          : esJava ? '(_linea >= ENTRADA.length)' : '(_linea >= ENTRADA.Length)';
        case 'random': usa('random'); return `_random(${a(0)})`;
        case 'alen': return esC ? aviso(n.linea, 'alen(): en C el tamaño de un vector no se puede consultar; guardalo en una variable')
          : esCpp ? `((double) ${a(0)}.size() - 1)` : `((double) ${a(0)}.length - 1)`;
        case 'ord': case 'ascii': return `((double) ${esC ? `${a(0)}[0]` : esCpp ? `${a(0)}[0]` : esJava ? `${a(0)}.charAt(0)` : `${a(0)}[0]`})`;
        case 'ifval': return `((${a(0)}) ? (${a(1)}) : (${a(2)}))`;
        case 'terminar':
          if (esC || esCpp) return 'exit(0)';
          usa('terminar');
          return 'throw new _Terminado()';
        default: {
          const s = subs.get(n.nombre);
          if (!s) return aviso(n.linea, `la subrutina "${n.nombre}" no tiene equivalente directo`);
          const conRef = (s.params || []).some(refSimple);
          if (conRef && esJava) {
            if (comoSentencia) return llamadaConRef(n, s);
            /* Como expresión no hay dónde devolver el valor: se dice, no se
               finge que anduvo. */
            return aviso(n.linea,
              `${n.nombre}() cambia un parámetro por referencia y en Java eso no se puede `
              + 'hacer en medio de una expresión: guardá la llamada en una línea propia');
          }
          return `${nombre(n.nombre)}(${argumentos(s, args, [])})`;
        }
      }
    }

    /* ¿Este parámetro viaja por referencia y es de tipo simple? Los arreglos y
       los registros ya viajan por referencia solos en estos lenguajes. */
    function refSimple(p) {
      if (!p || !p.porRef) return false;
      const t = resolver(p.tipo);
      return !t || (t.k !== 'arr' && t.k !== 'rec');
    }

    /* Un parámetro por referencia se pasa distinto según el lenguaje:
         C y C++ .... puntero, o referencia nativa en C++
         C# ......... la palabra "ref", que existe y hace exactamente esto
         Java ....... una cajita de un elemento, y hay que copiar de vuelta
                      después de la llamada (ver llamadaConRef) */
    function argumentos(sub, args, cajas) {
      return (args || []).map((x, i) => {
        const p = (sub.params || [])[i];
        if (!refSimple(p)) return expr(x);
        if (esC) return `&${expr(x)}`;
        if (esCpp) return expr(x);
        if (esCs) return `ref ${expr(x)}`;
        /* Java no tiene nada de eso: cajita con nombre, para poder devolver
           el valor a la variable original cuando la llamada termina. */
        const caja = '_ref' + (cajas.length + 1);
        cajas.push({ caja, tipo: tipoTexto(p.tipo), destino: expr(x) });
        return caja;
      }).join(', ');
    }

    /* En Java, llamar a una subrutina con parámetros por referencia no es una
       expresión sino un bloquecito: crear la caja, llamar, y devolver lo que
       la subrutina dejó adentro. Sin esa última línea el parámetro por
       referencia no haría nada, que es el error clásico al traducir a mano. */
    function llamadaConRef(n, sub) {
      const cajas = [];
      const args = argumentos(sub, n.args || [], cajas);
      if (!cajas.length) return null;
      const s = sangria();
      const abre = cajas.map(c => `${s}  ${c.tipo}[] ${c.caja} = { ${c.destino} };`);
      const cierra = cajas.map(c => `${s}  ${c.destino} = ${c.caja}[0];`);
      return ['{'].concat(abre, [`${s}  ${nombre(n.nombre)}(${args});`], cierra, [`${s}}`]).join('\n');
    }

    function imprimir(args, comoSentencia) {
      usa('num');
      const partes = (args || []).map(x => {
        const t = resolver(tipoDe(x));
        const v = expr(x);
        const molde = t && t.k === 'cad' ? L.imprimirCad : t && t.k === 'log' ? L.imprimirLog : L.imprimirNum;
        return molde.replace('%V', v);
      });
      if (!partes.length) return comoSentencia ? '' : '0';
      return partes.join(' ');
    }

    function leer(args) {
      usa('leer');
      usa('val');
      return (args || []).map(x => {
        const t = resolver(tipoDe(x));
        return `${destino(x)} = ${t && t.k === 'cad' ? '_leerTexto()' : '_leerNumero()'};`;
      }).join(' ');
    }

    const destino = n => expr(n);

    /* ------------------------- sentencias ------------------------ */
    let nivel = 1;
    const sangria = () => '  '.repeat(nivel);

    function bloque(lista) {
      nivel++;
      const s = (lista || []).map(x => sangria() + sentencia(x)).join('\n');
      nivel--;
      return s;
    }

    function sentencia(s) {
      switch (s.t) {
        case 'asig': {
          if (s.valor.t === 'estruct') return aviso(s.linea, 'literal { … }: hay que armarlo campo por campo');
          return `${destino(s.destino)} = ${expr(s.valor)};`;
        }
        case 'exprStmt': {
          if (s.expr.t === 'llamada') {
            const c = llamada(s.expr, true);
            if (!c) return '';
            return /[;}]$/.test(c) ? c : c + ';';
          }
          return expr(s.expr) + ';';
        }
        case 'si': {
          let t = `if (${expr(s.cond)}) {\n${bloque(s.entonces)}\n${sangria()}}`;
          if (s.sino && s.sino.length) t += ` else {\n${bloque(s.sino)}\n${sangria()}}`;
          return t;
        }
        case 'mientras':
          return `while (${expr(s.cond)}) {\n${bloque(s.cuerpo)}\n${sangria()}}`;
        case 'repetir':
          return `do {\n${bloque(s.cuerpo)}\n${sangria()}} while (${L.no}(${expr(s.cond)}));`;
        case 'desde': {
          const k = destino(s.ctrl);
          const paso = s.paso ? expr(s.paso) : '1';
          const cmp = /^-/.test(paso) ? '>=' : '<=';
          return `for (${k} = ${expr(s.desde)}; ${k} ${cmp} ${expr(s.hasta)}; ${k} += ${paso}) {\n`
               + `${bloque(s.cuerpo)}\n${sangria()}}`;
        }
        case 'eval': {
          const partes = (s.casos || []).map((c, i) =>
            `${i ? ' else ' : ''}if (${expr(c.cond)}) {\n${bloque(c.cuerpo)}\n${sangria()}}`);
          let t = partes.join('');
          if (s.sino && s.sino.length) t += ` else {\n${bloque(s.sino)}\n${sangria()}}`;
          return t;
        }
        case 'retorna': return s.valor ? `return ${expr(s.valor)};` : 'return;';
        case 'error': return aviso(s.linea, 'línea con un error de sintaxis (modo flexible)');
        default: return aviso(s.linea, `sentencia "${s.t}" que el traductor no conoce`);
      }
    }

    /* ----------------------- declaraciones ----------------------- */
    function declaraciones(prog, estatico) {
      const lineas = [];
      const pre = estatico && conClase ? 'static ' : '';
      for (const c of prog.consts || []) {
        const t = typeof c.valor.v === 'string' ? { k: 'cad' } : { k: 'num' };
        ambito.set(c.nombre, t);
        const konst = esC || esCpp ? 'const ' : esJava ? 'static final ' : 'const ';
        lineas.push(`${estatico ? konst : ''}${tipoTexto(t)} ${nombre(c.nombre)} = ${expr(c.valor)};`);
      }
      for (const d of prog.vars || []) {
        const tipoDecl = d.tipo || tipoDelLiteral(d.init);
        for (const n of d.nombres) {
          ambito.set(n, tipoDecl);
          const inicial = d.init && d.init.t !== 'estruct' ? expr(d.init) : porDefecto(tipoDecl);
          lineas.push(`${pre}${tipoTexto(tipoDecl)} ${nombre(n)} = ${inicial};`);
        }
      }
      return lineas;
    }

    /* --------------------------- armado -------------------------- */
    for (const t of ast.tipos || []) tipos.set(t.nombre, t.tipo);
    for (const s of ast.subs || []) subs.set(s.nombre, s);

    const globales = declaraciones(ast, true);
    const ambitoGlobal = new Map(ambito);

    nivel = conClase ? 1 : 0;
    const cuerpo = bloque(ast.cuerpo);
    nivel = 1;

    /* subrutinas */
    const funciones = (ast.subs || []).map(sub => {
      ambito = new Map(ambitoGlobal);
      refs = new Set();
      const params = (sub.params || []).map(p => {
        ambito.set(p.nombre, p.tipo);
        const t = resolver(p.tipo);
        const simple = !t || (t.k !== 'arr' && t.k !== 'rec');
        if (p.porRef && simple) {
          if (esC) { refs.add(p.nombre); return `${tipoTexto(p.tipo)}* ${nombre(p.nombre)}`; }
          if (esCpp) return `${tipoTexto(p.tipo)}& ${nombre(p.nombre)}`;
          if (esCs) return `ref ${tipoTexto(p.tipo)} ${nombre(p.nombre)}`;
          refs.add(p.nombre);
          return `${tipoTexto(p.tipo)}[] ${nombre(p.nombre)}`;
        }
        if (esCpp && p.porRef) return `${tipoTexto(p.tipo)}& ${nombre(p.nombre)}`;
        return `${tipoTexto(p.tipo)} ${nombre(p.nombre)}`;
      });
      const locales = declaraciones(sub, false).map(l => '  '.repeat(conClase ? 2 : 1) + l);
      nivel = conClase ? 1 : 0;
      const cuerpoSub = bloque(sub.cuerpo);
      nivel = 1;
      const ret = sub.retorna ? tipoTexto(sub.retorna) : L.vacio;
      const pre = conClase ? '  static ' : (esC || esCpp ? 'static ' : '');
      const cierre = conClase ? '  }' : '}';
      return `${pre}${ret} ${nombre(sub.nombre)}(${params.join(', ')}) {\n`
        + (locales.length ? locales.join('\n') + '\n' : '')
        + cuerpoSub + '\n' + cierre;
    });
    ambito = ambitoGlobal;

    /* prototipos: en C y C++ una subrutina tiene que estar declarada antes
       de usarse, y el cuerpo principal va primero. */
    const prototipos = (esC || esCpp) ? (ast.subs || []).map(sub => {
      const params = (sub.params || []).map(p => {
        const t = resolver(p.tipo);
        const simple = !t || (t.k !== 'arr' && t.k !== 'rec');
        if (p.porRef && simple) return esCpp ? `${tipoTexto(p.tipo)}&` : `${tipoTexto(p.tipo)}*`;
        if (esCpp && p.porRef) return `${tipoTexto(p.tipo)}&`;
        return tipoTexto(p.tipo);
      });
      return `static ${sub.retorna ? tipoTexto(sub.retorna) : L.vacio} ${nombre(sub.nombre)}(${params.join(', ')});`;
    }) : [];

    /* registros declarados */
    const structs = registros.map(r => {
      const campos = camposDe(r.tipo)
        .map(c => `  ${conClase ? 'public ' : ''}${tipoTexto(c.tipo)} ${nombre(c.nombre)}${(esC || esCpp) ? '' : ' = ' + porDefecto(c.tipo)};`);
      const pre = conClase ? '  ' + L.estructura + ' ' : L.estructura + ' ';
      const fin = (esC || esCpp) ? '};' : (conClase ? '  }' : '}');
      return `${pre}${r.nombre} {\n${campos.map(c => (conClase ? '  ' : '') + c).join('\n')}\n${fin}`;
    });

    /* entrada de datos */
    const entrada = (opts.entrada || '').replace(/\r/g, '');
    const lineasEntrada = entrada.length ? entrada.split('\n') : [];
    const listaEntrada = lineasEntrada.map(l => JSON.stringify(l)).join(', ');
    const declEntrada = esC
      ? `static const char* ENTRADA[] = { ${listaEntrada || '""'} };\n`
        + `static const int _ENTRADA_N = ${lineasEntrada.length};`
      : esCpp
        ? `static const std::vector<std::string> ENTRADA = { ${listaEntrada} };`
        : esJava
          ? `  static final String[] ENTRADA = { ${listaEntrada} };`
          : `  static readonly string[] ENTRADA = { ${listaEntrada} };`;

    /* En C hace falta ctype.h si se usan upper/lower. */
    const cabecera = L.cabecera.slice();
    if (esC && ayudas.has('caso')) cabecera.splice(3, 0, '#include <ctype.h>');
    if (esCpp && ayudas.has('caso')) cabecera.splice(4, 0, '#include <cctype>');
    if (esCs) cabecera.push('using System.Collections.Generic;');

    const textoAyudas = ORDEN.filter(a => ayudas.has(a)).map(a => A[a])
      .map(t => (conClase ? t.split('\n').map(l => (l ? '  ' + l : l)).join('\n') : t))
      .join('\n\n');

    const encabezado = [
      `/*`,
      ` * Traducción a ${L.nombre} de un programa ESLE2${ast.nombre ? ` («${ast.nombre}»)` : ''}.`,
      ` * Generada por https://esle2.vercel.app — se compila y corre con:`,
      ` *     ${L.corre}`,
      ` *`,
      ` * Los vectores conservan los índices desde 1: la casilla 0 queda sin usar.`,
      refs2(ast) ? ' * Un parámetro por referencia de SL se traduce ' + (
        esC ? 'con un puntero.'
          : esCpp ? 'con una referencia (&).'
            : esCs ? 'con la palabra ref, que en C# hace exactamente eso.'
              : 'con un arreglo de un solo elemento, porque Java no tiene punteros:\n'
                + ' * la llamada queda en un bloque que copia el valor de vuelta al terminar.'
      ) : '',
      esC ? ` * Las cadenas son char* pedidos con malloc y este programa no los libera:` : '',
      esC ? ` * es una traducción para leer, no código para producción.` : '',
      ` */`
    ].filter(l => l !== '');

    let codigo;
    if (conClase) {
      const clase = L.clase;
      const abre = esCs ? [] : [];
      codigo = encabezado
        .concat(cabecera, cabecera.length ? [''] : [])
        .concat(abre)
        .concat([`public class ${clase} {`, ''])
        .concat([`  // Lo que en el IDE es el panel «Entrada de datos»: una línea por elemento.`, declEntrada, ''])
        .concat(structs.length ? structs.concat(['']) : [])
        .concat(textoAyudas ? [`  // ---------- ayudas que imitan a las subrutinas de SLE2 ----------`, textoAyudas, ''] : [])
        .concat(globales.length ? [`  // ---------- variables del programa ----------`]
          .concat(globales.map(g => '  ' + g)).concat(['']) : [])
        .concat([`  public static void main(String[] args) {`.replace('main(String[] args)', esCs ? 'Main(string[] args)' : 'main(String[] args)')])
        .concat(ayudas.has('terminar') ? ['    try {'] : [])
        .concat([cuerpo])
        .concat(ayudas.has('terminar') ? ['    } catch (_Terminado e) { }'] : [])
        .concat([`  }`, ''])
        .concat(funciones.length ? [funciones.join('\n\n'), ''] : [])
        .concat([`}`])
        .join('\n');
      if (esCs) codigo = codigo.replace('public class Programa {', 'public class Programa {');
    } else {
      codigo = encabezado
        .concat(cabecera, [''])
        .concat([`// Lo que en el IDE es el panel «Entrada de datos»: una línea por elemento.`, declEntrada, ''])
        .concat(structs.length ? structs.concat(['']) : [])
        .concat(textoAyudas ? [`// ---------- ayudas que imitan a las subrutinas de SLE2 ----------`, textoAyudas, ''] : [])
        .concat(prototipos.length ? prototipos.concat(['']) : [])
        .concat(globales.length ? [`// ---------- variables del programa ----------`].concat(globales).concat(['']) : [])
        .concat([`int main(void) {`])
        .concat([cuerpo])
        .concat([`  return 0;`, `}`, ''])
        .concat(funciones.length ? [funciones.join('\n\n'), ''] : [])
        .join('\n');
    }

    return { codigo: codigo.replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') + '\n', avisos };

    function refs2(a) {
      return (a.subs || []).some(s => (s.params || []).some(p => p.porRef));
    }
  }

  global.TraductorC = { traducir, LENGUAJES };
})(typeof window !== 'undefined' ? window : globalThis);
