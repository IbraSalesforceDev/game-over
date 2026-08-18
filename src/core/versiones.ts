/**
 * Versiones del juego.
 *
 * A partir de aquí se acabaron las fases y los bloques: el juego tiene
 * versiones, y se numeran `mayor.menor.parche`.
 *
 *   mayor  — un cambio grande, o una tanda que añade muchas cosas a la vez.
 *   menor  — algo nuevo, pero de tamaño normal.
 *   parche — arreglos y retoques pequeños.
 *
 * El parche vuelve a 0 cada vez que sube el menor, y el menor vuelve a 0 cada
 * vez que sube el mayor. Es la regla de siempre y no hace falta inventarse
 * otra.
 *
 * La lista de abajo es la historia real del repositorio traducida a esa regla,
 * commit a commit. No es decorativa: al crear un mundo se elige una de estas
 * versiones y el mundo se construye con lo que había entonces y nada más. Por
 * eso el orden importa y por eso cada entrada dice qué trajo — es a la vez el
 * registro de cambios y la tabla que decide qué existe en cada partida.
 *
 * Se rebobinan dos cosas, y las dos importan: **qué hay** —bloques, bichos,
 * recetas, biomas, sistemas— y **cómo se ve**. Lo segundo se olvidó en la
 * primera entrega de esto y el resultado era un 1.4.0 con sprites animados,
 * montañas de fondo y el sol poniéndose, ninguno de los cuales existía: no era
 * una reconstrucción de 1.4.0, era el juego de hoy con menos bloques.
 *
 * Lo que no se rebobina es el motor: las físicas, la caché de chunks, el
 * formato de guardado y la carpintería de la interfaz —menús, pausa, ajustes—
 * son los de hoy en todas las versiones. Es una reconstrucción, no una máquina
 * del tiempo, y conviene decirlo en voz alta en vez de dejarlo entender.
 */

export type Etapa = 'prealfa' | 'alfa' | 'beta' | 'estable';

export interface Version {
  /** "1.2.0". Es también la clave que se guarda con el mundo. */
  readonly id: string;
  readonly etapa: Etapa;
  /** Título corto, para la lista desplegable. */
  readonly nombre: string;
  /** Qué cambia respecto de la anterior, en una frase. */
  readonly resumen: string;
  /** Lo que trajo, en viñetas cortas. */
  readonly cambios: readonly string[];
}

/**
 * Todas las versiones, de la más antigua a la más nueva.
 *
 * El orden de este array es la ordenación: comparar por índice es más rápido y
 * mucho más difícil de romper que interpretar los tres números, y como la
 * lista se escribe a mano no hay forma de que se desordene sola.
 */
export const VERSIONES: readonly Version[] = [
  {
    id: '1.0.0',
    etapa: 'prealfa',
    nombre: 'El andamiaje',
    resumen: 'Lo primero que hubo: un lienzo, un bucle a 60 y nada más.',
    cambios: ['Canvas a pantalla completa', 'Bucle de paso fijo', 'Pantalla de carga'],
  },
  {
    id: '1.1.0',
    etapa: 'prealfa',
    nombre: 'Laboratorio de físicas',
    resumen: 'Aparece el personaje y se puede correr y saltar. Sin mundo todavía.',
    cambios: [
      'Correr, saltar con altura variable y coyote time',
      'Colisiones contra la rejilla, sin atravesar nada',
      'Escenario de pruebas hecho a mano',
    ],
  },
  {
    id: '1.2.0',
    etapa: 'prealfa',
    nombre: 'Minar y construir',
    resumen: 'Ya se pueden romper y poner bloques, y existe la capa de paredes.',
    cambios: ['Picar y colocar', 'Capa de pared detrás del bloque', 'Auto-tiling'],
  },
  {
    id: '1.3.0',
    etapa: 'prealfa',
    nombre: 'Mundo generado',
    resumen: 'El escenario de pruebas deja paso a un mundo de verdad, con semilla.',
    cambios: ['Relieve por ruido', 'Cuevas', 'Vetas de mineral', 'Árboles'],
  },
  {
    id: '1.4.0',
    etapa: 'prealfa',
    nombre: 'Guardado',
    resumen: 'El mundo sobrevive a cerrar la pestaña.',
    cambios: ['Guardado comprimido', 'Menú de mundos', 'Autoguardado'],
  },
  {
    id: '1.5.0',
    etapa: 'prealfa',
    nombre: 'Luz y día-noche',
    resumen: 'Las cuevas se oscurecen, las antorchas alumbran y el sol se mueve.',
    cambios: [
      'Iluminación propagada',
      'Antorchas',
      'Ciclo de día y noche, con sol, luna y estrellas',
    ],
  },
  {
    id: '1.6.0',
    etapa: 'prealfa',
    nombre: 'Inventario',
    resumen: 'Lo que se pica se recoge y se guarda.',
    cambios: ['Objetos y pilas', 'Barra rápida', 'Objetos por el suelo'],
  },
  {
    id: '1.7.0',
    etapa: 'prealfa',
    nombre: 'Crafteo y cofres',
    resumen: 'Mesa, horno y yunque: los materiales pasan a servir para algo.',
    cambios: ['Recetas y estaciones', 'Cofres', 'Lingotes y las primeras herramientas'],
  },
  {
    id: '2.0.0',
    etapa: 'prealfa',
    nombre: 'Enemigos y combate',
    resumen: 'Deja de ser un juego de construir: ahora hay algo que te puede matar.',
    cambios: ['Vida y muerte', 'Slimes, zombis y murciélagos', 'Espadas y botín'],
  },
  {
    id: '2.1.0',
    etapa: 'prealfa',
    nombre: 'Líquidos y biomas',
    resumen: 'Agua que corre, lava en el fondo y los dos primeros biomas.',
    cambios: ['Agua y lava simuladas', 'Nadar y aliento', 'Desierto y nieve', 'Cubos'],
  },
  {
    id: '2.2.0',
    etapa: 'prealfa',
    nombre: 'Se ve y se oye',
    resumen: 'Sprites animados, partículas, fondo con parallax y sonido.',
    cambios: [
      'Sprites animados del personaje y de los bichos, que hasta aquí eran cajas',
      'Montañas y nubes de fondo con parallax',
      'Partículas y sombras',
      'Audio sintetizado',
    ],
  },
  {
    id: '2.2.1',
    etapa: 'prealfa',
    nombre: 'Pulido de navegador',
    resumen: 'Iconos de objeto con forma propia y el panel de controles.',
    cambios: [
      'Iconos de objeto con forma propia, que eran cuadrados de color',
      'El objeto que llevas se ve en la mano',
      'Panel de ayuda',
      'El overlay ya no sale de serie',
    ],
  },
  {
    id: '2.3.0',
    etapa: 'prealfa',
    nombre: 'Hambre y animales',
    resumen: 'Hay que comer, y para comer hay que cazar.',
    cambios: ['Barra de hambre', 'Conejos y jabalíes', 'Horno para asar', 'Taller propio'],
  },
  {
    id: '2.3.1',
    etapa: 'prealfa',
    nombre: 'Caída, pausa y arreglos',
    resumen: 'Daño de caída, menú de pausa y el fallo que se comía los cofres.',
    cambios: ['Daño por caída', 'Menú de pausa', 'Arreglado el cofre que se borraba'],
  },
  {
    id: '3.0.0',
    etapa: 'prealfa',
    nombre: 'Progresión',
    resumen: 'La tanda más grande: herramientas por nivel, dificultad, armadura, arco y mapas.',
    cambios: [
      'Cada bloque pide su nivel de pico',
      'Diez niveles de dificultad',
      'Esqueleto, serpiente y momia',
      'Cristales de vida',
      'Armadura de cuatro metales',
      'Arco y flechas',
      'Pala y azada',
      'Caña, papel y la escalera de mapas',
    ],
  },
  {
    id: '3.1.0',
    etapa: 'prealfa',
    nombre: 'El mundo crece',
    resumen: 'Selva, taiga, montañas y mares. Cada bioma tira de un metal.',
    cambios: ['Selva y taiga', 'Montañas con cumbre pelada', 'Mares con playa', 'Grava'],
  },
  {
    id: '3.2.0',
    etapa: 'prealfa',
    nombre: 'Lava, hardcore y huerto',
    resumen: 'La lava quema a todos, aparece el hardcore y se puede cultivar.',
    cambios: [
      'La lava hace daño a todo el mundo, sin matar de un toque',
      'Agua y lava hacen obsidiana',
      'Modo hardcore',
      'Botas y guantes',
      'Huerto, camas, brotes y gallinas',
    ],
  },
  {
    id: '4.0.0',
    etapa: 'prealfa',
    nombre: 'La fortaleza',
    resumen: 'Aparece un final: una fortaleza enterrada, un altar y un jefe.',
    cambios: [
      'Fortaleza de ladrillo en la caverna',
      'Cabañas y minas abandonadas',
      'Altar y el guardián de la fortaleza',
      'Brújula que señala lo construido',
      'Espada del guardián y esencia',
    ],
  },
  {
    id: '4.1.0',
    etapa: 'prealfa',
    nombre: 'Se ve y se explica',
    resumen: 'La armadura se ve puesta, cada material suena distinto y los objetos se explican.',
    cambios: [
      'La armadura puesta se ve en el personaje',
      'Sonido de rotura por material y voces de los bichos',
      'Ficha de objeto al pasar el ratón',
      'Ajustes de zoom, oscuridad y resolución',
    ],
  },
  {
    id: '4.2.0',
    etapa: 'prealfa',
    nombre: 'Elegir versión',
    resumen: 'Se puede crear un mundo con cualquier versión anterior del juego.',
    cambios: [
      'Selector de versión al crear el mundo',
      'Cada versión trae solo lo que existía entonces',
      'La versión se guarda con el mundo',
    ],
  },
  {
    id: '4.2.1',
    etapa: 'prealfa',
    nombre: 'Las versiones viejas se ven viejas',
    resumen: 'El aspecto también retrocede: sprites, fondo, luz e iconos de su época.',
    cambios: [
      'Antes de 2.2.0, el personaje y los bichos vuelven a ser cajas',
      'Antes de 2.2.0, sin montañas de fondo ni sombras',
      'Antes de 2.2.1, los objetos son cuadrados de color',
      'Antes de 1.5.0, sin sol, luna ni estrellas',
      'Los medidores del HUD aparecen cuando aparecieron',
    ],
  },
  {
    id: '4.2.2',
    etapa: 'prealfa',
    nombre: 'Ningún objeto se cuela',
    resumen: 'Cada objeto dice de qué versión es, y no aparece en las anteriores.',
    cambios: [
      'El menú de depuración solo ofrece lo que existe en el mundo',
      'Los bloques y los bichos no sueltan lo que aún no se había inventado',
      'El equipo de salida también depende de la versión',
      'Lo que se cuele en el zurrón no se puede usar',
    ],
  },
  {
    id: '4.3.0',
    etapa: 'prealfa',
    nombre: 'Cambiar de versión',
    resumen: 'Un mundo ya creado puede subir o bajar de versión, con lo que eso rompe.',
    cambios: [
      'Subir o bajar cualquier mundo a cualquier versión',
      'Lo que construiste se conserva, con su terreno alrededor',
      'Lo que nunca tocaste se rehace con la generación de la otra versión',
      'Los bloques que no existían se convierten en su pariente más cercano',
      'Pantalla de confirmación con las cifras exactas de lo que se pierde',
    ],
  },
  {
    id: '5.0.0',
    etapa: 'prealfa',
    nombre: 'El mundo se hace grande',
    resumen: 'Varios biomas de cada clase, cuatro minerales más y el inframundo.',
    cambios: [
      'Varios desiertos, selvas y nieves por mundo, de tamaños distintos',
      'Los biomas bajan el triple de hondo',
      'Tamaño de mundo titánico',
      'Carbón, cobalto, titanio e infernita',
      'El inframundo: roca que alumbra sola y lagos de lava',
      'Lianas colgando de la selva',
    ],
  },
  {
    id: '5.1.0',
    etapa: 'prealfa',
    nombre: 'Cada bioma tiene su horizonte',
    resumen: 'El fondo deja de ser el mismo teñido de otro color y cambia de forma.',
    cambios: [
      'Desierto: dunas largas y una pirámide',
      'Selva: una pared de árboles altísimos, verde de verdad',
      'Nieve: un pico enorme, más alto que ninguna montaña',
      'Mar: casi todo horizonte, con dos islas a lo lejos',
      'El bosque conserva sus cordilleras',
    ],
  },
  {
    id: '5.2.0',
    etapa: 'prealfa',
    nombre: 'Cuevas de bioma',
    resumen: 'El desierto y la nieve tienen cavernas propias, con cofres dentro.',
    cambios: [
      'Cuevas de arenisca bajo el desierto',
      'Cuevas heladas bajo la nieve',
      'Cofres con cobalto, titanio y lo mejor de cada sitio',
      'La brújula y el mapa también las señalan',
    ],
  },
  {
    id: '5.3.0',
    etapa: 'prealfa',
    nombre: 'Lo que vive abajo',
    resumen: 'Cuatro enemigos nuevos, uno por cada profundidad, y élites de noche.',
    cambios: [
      'Gólem de arenisca en el subsuelo del desierto',
      'Espectro de hielo en el de la nieve',
      'Araña en la selva, de día y de noche',
      'Diablillos en el inframundo, que estaba vacío',
      'De noche, en la superficie, salen enemigos de élite',
      'La élite pega el doble y suelta el botín bueno',
    ],
  },
  {
    id: '5.3.1',
    etapa: 'prealfa',
    nombre: 'La lava con fondo',
    resumen: 'Los lagos del inframundo se cavan antes de llenarse, y hay un mar.',
    cambios: [
      'Se acabaron las láminas de lava de un tile cruzando la pantalla',
      'Cuencas cavadas en la roca: los lagos tienen calado',
      'Un mar de lava en el fondo, con islas de roca',
      'Casi el triple de lava que antes',
    ],
  },
  {
    id: '5.4.0',
    etapa: 'prealfa',
    nombre: 'Arquería',
    resumen: 'Tres arcos más y tres puntas de flecha que cambian a qué apuntas.',
    cambios: [
      'Arco de caza, de cobalto e infernal',
      'Flecha de pedernal: más daño y barata',
      'Flecha de hueso: atraviesa hasta tres bichos',
      'Flecha de fuego: estalla y reparte alrededor',
      'El arco gasta siempre la mejor flecha que lleves',
      'Zoom de ×1 a ×6, con las teclas + y −',
    ],
  },
  {
    id: '6.0.0',
    etapa: 'prealfa',
    nombre: 'Un mundo más hondo',
    resumen: 'Medio mundo más de subsuelo, y un inframundo del doble de alto.',
    cambios: [
      'Todos los tamaños ganan un 50 % de altura',
      'Lo nuevo va todo abajo: la superficie se juega igual',
      'El inframundo pasa de ser un octavo a casi un quinto del mundo',
      'Más mineral, cristales y agua, para que cavar rinda lo mismo',
    ],
  },
  {
    id: '6.0.1',
    etapa: 'prealfa',
    nombre: 'Repaso a fondo',
    resumen: 'Auditoría de todo el catálogo: lo que faltaba y lo que se colaba.',
    cambios: [
      'Troncos, hojas, cactus y hierba ya se pueden fabricar',
      'Los abedules y los pinos dejan de salir dos versiones antes de existir',
      'No se puede migrar un mundo a una versión que no tenía mundo',
    ],
  },
  {
    id: '6.1.0',
    etapa: 'prealfa',
    nombre: 'El infierno se puede pisar',
    resumen: 'El inframundo gana suelo por el que andar y un fondo propio.',
    cambios: [
      'Una repisa de roca infernal a media altura, con boquetes',
      'Columnas del suelo al techo por las que subir',
      'Fondo propio: agujas de roca sobre el resplandor de la lava',
      'Ni nubes ni sol ahí abajo: alumbra la lava',
    ],
  },
  {
    id: '6.2.0',
    etapa: 'prealfa',
    nombre: 'Fortalezas del infierno',
    resumen: 'Puestos de ladrillo infernal sobre la repisa, con lo mejor dentro.',
    cambios: [
      'Varias fortalezas por mundo, apoyadas en el suelo',
      'Ladrillo infernal: alumbra y pide pico de nivel 6',
      'Cofres con lingotes de cobalto, titanio e infernita',
      'La brújula y el mapa las señalan',
    ],
  },
  {
    id: '6.2.1',
    etapa: 'prealfa',
    nombre: 'Se acabó el tirón del titánico',
    resumen: 'El simulador de líquidos ya no depende de lo grande que sea el mundo.',
    cambios: [
      'Titánico: de 5 a 58 fotogramas por segundo',
      'Se acabó también el bache de los primeros segundos en los demás',
      'Un paso de líquidos cuesta lo mismo en cualquier tamaño',
    ],
  },
  {
    id: '6.3.0',
    etapa: 'prealfa',
    nombre: 'Las estructuras se defienden',
    resumen: 'Más grandes, con guarnición, trampas, mejor botín y paredes más duras.',
    cambios: [
      'La fortaleza pasa de doce salas a veinticuatro',
      'Minas del doble de largas y cuevas de bioma mucho más anchas',
      'Cada estructura tiene sus propios bichos, y salen al doble de ritmo',
      'Dentro puede haber élites a cualquier hora y profundidad',
      'Trampas de pinchos por los suelos',
      'El ladrillo de fortaleza pide pico de hierro',
      'Cofres bastante mejores, con lingotes y flechas buenas',
      'Las cabañas se quedan como estaban: son el refugio',
    ],
  },
  {
    id: '6.3.1',
    etapa: 'prealfa',
    nombre: 'El infierno tiene fondo',
    resumen: 'El fondo del inframundo, que existía desde 6.1.0, por fin se ve.',
    cambios: [
      'Se quita la pared de detrás del aire del inframundo: tapaba el fondo entero',
      'Resplandor de ambiente ahí abajo, para que el sitio no sea una pantalla apagada',
      'Su propio degradado en vez del cielo: ya no se ve azul por los huecos',
      'Las agujas de roca del fondo suben a la altura de la vista',
      'La lava tapa del todo y ya no deja ver el fondo a través',
    ],
  },
  {
    id: '6.4.0',
    etapa: 'prealfa',
    nombre: 'Metalurgia',
    resumen: 'Armadura de los tres metales hondos, bloques de metal, pólvora y explosivos.',
    cambios: [
      'Armadura entera de cobalto, titanio e infernita: los tres tenían pico y espada y nada que ponerse',
      'Bloques de metal de los siete metales: se comprimen cinco a uno y se deshacen uno a cinco',
      'Pólvora, que por fin le da salida al carbón',
      'Bombas y dinamita: se tiran, rebotan y abren el terreno de un golpe',
      'Y estallan también en tus narices, así que hay que echar a correr',
      'El ladrillo infernal y los pinchos por fin se recogen y se fabrican',
    ],
  },
  {
    id: '6.4.1',
    etapa: 'prealfa',
    nombre: 'Sitio para más bloques',
    resumen: 'La frontera entre tiles y objetos se mueve del 64 al 128.',
    cambios: [
      'Con los bloques de metal quedaban tres huecos antes de chocar con el primer lingote',
      'Los objetos guardados se traducen solos al abrir la partida',
      'No cambia nada de lo que se ve: es sitio para lo que viene',
    ],
  },
  {
    id: '6.5.0',
    etapa: 'prealfa',
    nombre: 'Electricidad improvisada',
    resumen: 'Cable, bombillas, interruptores y baterías de cobre.',
    cambios: [
      'El cobre vuelve a servir para algo después del hierro',
      'La batería empuja corriente por el cable, y la corriente se gasta con la distancia',
      'La bombilla alumbra mucho más que una antorcha, y desde el techo',
      'El interruptor corta el cable: un mismo tendido enciende tres salas por separado',
      'Alumbrar una mina entera obliga a repartir baterías, no a poner una en la entrada',
    ],
  },
  {
    id: '6.6.0',
    etapa: 'prealfa',
    nombre: 'El panel de servicio, ordenado',
    resumen: 'El menú de depuración va por pestañas y trae bastantes más perillas.',
    cambios: [
      'Cuatro pestañas —objetos, jugador, bichos y mundo— en vez de una columna con scroll',
      'Buscador en las listas de objetos y de criaturas, que ya no caben en un desplegable',
      'Hora del día, con saltos a amanecer, mediodía, ocaso y noche, y el reloj se puede parar',
      'Interruptores para el hambre y para las apariciones',
      'Matar a todos, vaciar el inventario, dar una pila entera y volver al spawn',
      'Viajar a unas coordenadas concretas, no solo a las estructuras',
      'Marcador en vivo: semilla, tamaño, dónde estás, bioma, fps y bichos vivos',
    ],
  },
  {
    id: '6.7.0',
    etapa: 'prealfa',
    nombre: 'Sucesos',
    resumen: 'Ahora al mundo le pasan cosas por su cuenta.',
    cambios: [
      'Luna de sangre: el triple de bichos, el triple de élites, y dura hasta que amanece',
      'Lluvia de estrellas: caen meteoritos que abren cráteres con cobalto y titanio',
      'Enjambre: minuto y medio de bichos viniendo sin parar desde los dos lados',
      'Se avisa siempre antes, y no se repite el mismo dos veces seguidas',
      'Uno de cada tres es un regalo, para que ver el cartel no sea siempre malo',
    ],
  },
  {
    id: '6.8.0',
    etapa: 'prealfa',
    nombre: 'El guardián, más duro',
    resumen: 'El jefe se había quedado pequeño desde que hay armaduras de los hondos.',
    cambios: [
      'El guardián aguanta bastante más y pega más fuerte',
      'Embiste más a menudo cuando se enfurece, y llama esbirros más seguido',
      'La ofrenda del altar sube: más hueso, más oro y plata, más gel y tres reliquias',
      'Y pide cobalto: bajar a los hondos deja de ser opcional para despertarlo',
      'Los mundos anteriores a esta versión conservan el guardián y la ofrenda de antes',
    ],
  },
  {
    id: '6.9.0',
    etapa: 'prealfa',
    nombre: 'Efectos y pociones',
    resumen: 'Ahora hay cosas que te duran un rato: fuego, veneno, fuerza.',
    cambios: [
      'Siete efectos de estado, tres que se sufren y cuatro que se buscan',
      'Salir de la lava ya no apaga: se sigue ardiendo unos segundos',
      'El caldero, cuarta estación, y el frasco, que se sopla en el horno',
      'Seis pociones: vida, regeneración, fuerza, piel de piedra, ligereza y remedio',
      'La flecha de fuego prende de verdad, y el fuego también le entra a los bichos',
      'Distintivos en pantalla con lo que llevas puesto y los segundos que le quedan',
    ],
  },
  {
    id: '6.10.0',
    etapa: 'prealfa',
    nombre: 'Ataques especiales',
    resumen: 'Los bichos dejan de limitarse a andar hacia ti.',
    cambios: [
      'La momia y el diablillo lanzan bolas de fuego, y prenden',
      'El gólem escupe tres puños de arena en abanico',
      'El lobo de hielo suelta ventisca, que te deja lento',
      'La araña escupe veneno en arco: se esquiva subiéndose a algo',
      'El esqueleto tira huesos, rápidos y sin efecto',
      'Ninguno dispara a través de una pared ni a bocajarro',
      'Las élites disparan casi el doble de seguido y sacan un proyectil más',
      'Salen bastantes más élites, y ahora también bajo tierra',
      'Y la mitad de las veces la élite suelta algo del botiquín',
    ],
  },
  {
    id: '7.0.0',
    etapa: 'prealfa',
    nombre: 'Un jefe por bioma',
    resumen: 'Ya no hay un final: hay seis puertas, y se abren en el orden que quieras.',
    cambios: [
      'Rey limo en la pradera, reina escarabajo en el desierto y yeti en la nieve',
      'Araña madre en la selva, devorador en la caverna y señor del fuego en el infierno',
      'Cada uno se despierta con su ídolo, y el ídolo solo funciona en su sitio',
      'Los seis rituales se preparan en el caldero con material de ese bioma',
      'El infernal pide 200 rocas del infierno, infernita y dos reliquias',
      'Los seis son de una dificultad parecida al guardián: no son una escalera',
      'Cada uno deja su trofeo, que servirá para el equipo de bioma',
      'La barra de arriba ya dice qué jefe es, y no siempre "el guardián"',
    ],
  },
  {
    id: '7.1.0',
    etapa: 'prealfa',
    nombre: 'Botín de jefe',
    resumen: 'Cada jefe deja un arma y un peto con una inscripción que hace algo.',
    cambios: [
      'Seis espadas y seis petos, uno de cada jefe, con el trofeo de por medio',
      'Cada arma lleva un filo que actúa solo: prende, envenena, hiela, cura...',
      'El mandoble de la caverna pega la mitad más estando bajo tierra',
      'Cada peto lleva un poder atado a la Q, con su recarga',
      'El peto de brasa lanza una bola de fuego hacia el ratón',
      'El de escarcha congela lo que tengas cerca y el de la selva lo envenena',
      'La inscripción se lee pasando el ratón por encima, antes de conseguirla',
      'Ni las espadas ni los petos son los que más pegan o defienden: se paga la inscripción',
    ],
  },
  {
    id: '7.2.0',
    etapa: 'prealfa',
    nombre: 'El guardián verdadero',
    resumen: 'Lo que había detrás del guardián todo este tiempo.',
    cambios: [
      'Seis reliquias, una por bioma, forjadas con el arma de ese jefe',
      'Con las seis encima, el altar de la fortaleza despierta al de verdad',
      'Aguanta más del doble que cualquier jefe de bioma y pega más que ninguno',
      'Va alternando los seis ataques del juego: cada recarga es otra pregunta',
      'Su sprite es el del guardián, coronado y con las seis reliquias girando',
      'Suelta la espada del guardián verdadero, la mejor del juego, y su corona',
      'Sin las seis reliquias el altar sigue despertando al guardián de siempre',
    ],
  },
];

/** La más nueva. Es la que trae marcada el menú. */
export const VERSION_ACTUAL = VERSIONES[VERSIONES.length - 1]!.id;

/** La más antigua que se puede elegir. */
export const VERSION_MINIMA = VERSIONES[0]!.id;

const INDICE = new Map<string, number>(VERSIONES.map((v, i) => [v.id, i]));

/**
 * Posición de una versión en la historia. -1 si no existe.
 *
 * Todo lo demás se apoya en esto: comparar por índice en vez de interpretar
 * "4.10.0" evita el clásico fallo de ordenar versiones como si fueran texto,
 * donde 4.10.0 va antes que 4.2.0.
 */
export function indiceVersion(id: string): number {
  return INDICE.get(id) ?? -1;
}

/** La versión pedida, o la actual si el id no se reconoce. */
export function version(id: string): Version {
  const i = indiceVersion(id);
  return VERSIONES[i] ?? VERSIONES[VERSIONES.length - 1]!;
}

/** ¿`a` es igual o posterior a `b`? Un id desconocido cuenta como la actual. */
export function alMenos(a: string, b: string): boolean {
  const ia = indiceVersion(a);
  const ib = indiceVersion(b);
  return (ia < 0 ? VERSIONES.length - 1 : ia) >= (ib < 0 ? VERSIONES.length - 1 : ib);
}

/**
 * Qué se puede encontrar en un mundo, y desde cuándo.
 *
 * Una sola tabla en vez de comprobaciones sueltas repartidas por el código.
 * Cada entrada es una cosa que el jugador nota —un bioma, un sistema, una
 * familia de objetos— con la versión en la que llegó. Preguntar por ellas es
 * lo único que hace falta para que un mundo de 2.1.0 no tenga selva.
 *
 * La granularidad no es por objeto sino por "cosa que se anunció": partirlo más
 * fino daría una tabla de doscientas entradas que nadie mantendría al día, y
 * partirlo menos dejaría versiones que no se distinguen entre sí.
 */
export const DESDE = {
  // --- Mundo ---
  mundoGenerado: '1.3.0',
  cuevas: '1.3.0',
  minerales: '1.3.0',
  arboles: '1.3.0',
  luz: '1.5.0',
  diaNoche: '1.5.0',
  liquidos: '2.1.0',
  biomasSecos: '2.1.0',
  biomasNuevos: '3.1.0',
  montanas: '3.1.0',
  mares: '3.1.0',
  grava: '3.1.0',
  cristalesVida: '3.0.0',
  cana: '3.0.0',
  estructuras: '4.0.0',
  cuevasDeBioma: '5.2.0',
  arqueria: '5.4.0',
  mundoHondo: '6.0.0',
  sueloInfernal: '6.1.0',
  fortalezaInfernal: '6.2.0',
  guarnicionEstructuras: '6.3.0',
  trampas: '6.3.0',
  explosivos: '6.4.0',
  electricidad: '6.5.0',
  sucesos: '6.7.0',
  guardianReforzado: '6.8.0',
  efectos: '6.9.0',
  alquimia: '6.9.0',
  ataquesEspeciales: '6.10.0',
  elitesPorTodas: '6.10.0',
  jefesDeBioma: '7.0.0',
  equipoDeJefe: '7.1.0',
  jefeFinal: '7.2.0',
  enemigosProfundos: '5.3.0',
  elitesNocturnos: '5.3.0',
  mineralesProfundos: '5.0.0',
  inframundo: '5.0.0',
  lianas: '5.0.0',

  // --- Sistemas ---
  inventario: '1.6.0',
  crafteo: '1.7.0',
  cofres: '1.7.0',
  combate: '2.0.0',
  particulas: '2.2.0',
  audio: '2.2.0',
  // --- Lo que se ve ---------------------------------------------------------
  //
  // El aspecto también tiene fecha. Un mundo de 1.4.0 con sprites animados,
  // montañas de fondo y sol poniéndose no es una reconstrucción de 1.4.0: es
  // el juego de hoy con menos bloques. Estas entradas son las que hacen que
  // una versión vieja se parezca a lo que fue.
  spritesAnimados: '2.2.0',
  fondoParallax: '2.2.0',
  fondoPorBioma: '5.1.0',
  sombras: '2.2.0',
  objetoEnMano: '2.2.1',
  astros: '1.5.0',
  iconosDibujados: '2.2.1',
  barraVida: '2.0.0',
  barraAliento: '2.1.0',
  hambre: '2.3.0',
  danoCaida: '2.3.1',
  nivelesHerramienta: '3.0.0',
  dificultad: '3.0.0',
  armadura: '3.0.0',
  mapas: '3.0.0',
  lavaQuema: '3.2.0',
  hardcore: '3.2.0',
  cultivos: '3.2.0',
  camas: '3.2.0',
  jefe: '4.0.0',
  brujula: '4.0.0',
  armaduraVisible: '4.1.0',
  audioPorMaterial: '4.1.0',
  fichaObjeto: '4.1.0',
} as const satisfies Record<string, string>;

export type Caracteristica = keyof typeof DESDE;

/** ¿Existe esta cosa en un mundo de esta versión? */
export function hay(que: Caracteristica, versionMundo: string): boolean {
  return alMenos(versionMundo, DESDE[que]);
}

/**
 * Etapa en palabras, para el sello del menú.
 *
 * Todas las versiones de hoy son prealfa y lo dicen: el juego no tiene ni
 * pantalla de título decente, y llamar "beta" a esto sería mentir en la única
 * pantalla donde el jugador todavía se fía de lo que lee.
 */
export const NOMBRE_ETAPA: Readonly<Record<Etapa, string>> = {
  prealfa: 'prealfa',
  alfa: 'alfa',
  beta: 'beta',
  estable: 'estable',
};
