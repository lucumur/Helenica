# Enlaces de las fichas fluviales

## Criterio

Cada lugar, accidente geográfico y personaje debe conducir a una ficha con contenido y fuentes. Un enlace a una ciudad no sustituye al de su golfo, ni el río físico sustituye a su dios. Los nombres modernos se distinguen de los antiguos y no se identifican por semejanza de escritura.

La primera migración añade 202 enlaces en 46 fichas a destinos existentes, sin cambiar sus textos. Se excluyen deliberadamente las coincidencias homónimas que producirían enlaces falsos. La carga reproducible de datos vuelve a aplicar estas reglas, para que no desaparezcan los enlaces al regenerar las fichas.

## Primera tanda propuesta: red del Akhelōos

Estas altas se proponen antes de crear muchas fichas, conforme al flujo acordado. Cada ficha nueva deberá tener descripción, datos, pertenencia geográfica cuando proceda y fuentes; no se propone crear fichas vacías.

| Entidad | Colección / tipo | Id propuesto | Criterio y comprobación |
|---|---|---|---|
| Pindos, cordillera completa | lugares / Monte | `pindos` | Πίνδος. La ficha existente `pindos-thessalia` tiene punto, perímetro y datos del sector meridional de Ágrafa; se conserva como sector y se distingue del conjunto. Heródoto 7.129; ficha existente y sus datos GMBA. |
| Koiláda Achelóou, valle del Aqueloo | lugares / Valle | `koilada-akheloou` | Κοιλάδα Αχελώου es una denominación local moderna documentada. La ficha describirá su ámbito comprobado, sin extenderlo automáticamente a todo el río ni presentarlo como nombre antiguo. |
| Mar Jónico | lugares / Mar | `ionios-mar` | Denominaciones atestiguadas Ἰόνιος, Ἰόνιος κόλπος y, en usos posteriores, Ἰόνιον πέλαγος; explicar la variación de extensión y de época. LSJ s.v. Ἰόνιος. |
| Echinades | lugares / Conjunto de islas | `echinades` | Ἐχινάδες. Conjunto junto a la desembocadura del Aqueloo; no son todas las islas Jónicas. Pleiades 530852; Tucídides 2.102; Pausanias 8.24.9–11. |
| Oiniadai | lugares / Polis | `oiniadai` | Ciudad acarnania del tramo bajo del río; verificar la localización y las variantes antes de fijar la ficha. |
| Stratos | lugares / Polis | `stratos-akarnania` | Ciudad de Acarnania junto al curso del Aqueloo. Distinguirla de otros topónimos homónimos. |
| Agrafiotis | lugares / Río | `agrafiotis` | Afluente moderno documentado en el plan EL04; no inventar una equivalencia antigua. |
| Tavropos / Megdovas | lugares / Río | `tavropos` | Una ficha con sus dos nombres, no dos ríos por duplicación de alias. Plan EL04. |
| Krikeliotis | lugares / Río | `krikeliotis` | Afluente documentado en el plan EL04; nombre y datos modernos señalados como tales. |
| Inakhos, afluente del Aqueloo | lugares / Río | `inakhos-akheloos` | Separar la identificación moderna firme de la ficha existente `inakhos-akarnania`, que reúne noticias antiguas divergentes. Revisar si esa ficha debe reutilizarse antes de dar el alta definitiva. |
| Akhelōos, el Potamós | entes / Dios fluvial | `akheloos-potamos` | Enlace recíproco al río. Genealogía de Hesíodo y versiones de Sófocles, sin convertir el relato mítico en geografía. |
| Ōkeanos | entes / Deidad | `okeanos` | Océano, padre de los ríos en Hesíodo; distinto de una ficha geográfica del océano. |
| Tēthys | entes / Deidad | `tethys` | Tetis titánide, madre de los ríos; distinta de Thetis, la madre de Aquiles. |
| Aitōlia | lugares / Región geográfica | `aitolia` | Región general, distinta de las fichas fechadas de los Aitōloi. Fijar la escala conforme al esquema y sin crear contornos nuevos en esta tanda. |
| Akarnania | lugares / Región geográfica | `akarnania` | Región general, distinta del ethnos `akarnanes-900`. No trasladar fronteras políticas de una fecha a otra. |

### Fuentes verificadas para preparar esta tanda

- [NECCA: valle del Aqueloo y áreas protegidas del golfo de Ambracia](https://necca.gov.gr/en/mdpp/management-unit-of-acheloos-valley-and-amvrakikos-gulf-protected-areas/).
- [Universidad Politécnica Nacional de Atenas, FILOTIS: KOILADA ACHELOOU KAI ORI VALTOU](https://filotis.itia.ntua.gr/biotopes/c/GR2110006/).
- [Pleiades: Echinades](https://pleiades.stoa.org/places/530852).
- [LSJ: Ἰόνιος, formas y pasajes de uso](https://atlas.perseus.tufts.edu/dictionaries/entry/urn%3Acite2%3Ascaife-viewer%3Adictionaries.v1%3Alsj-n50598/).
- [Hesíodo, Teogonía: genealogía de los ríos](https://chs.harvard.edu/primary-source/hesiod-theogony-sb/).
- [Akhelōios: testimonios antiguos, incluidas Traquinias 9–17](https://www.theoi.com/Potamos/PotamosAkheloios.html).
- [Plan hidrológico oficial EL04: red del Aqueloo](https://floods.ypeka.gr/wp-content/uploads/2025/09/EL04_P19_T1_en.pdf).

## Casos que no deben resolverse con enlaces automáticos

- `Pindos`: conjunto de la cordillera frente al sector meridional de la ficha existente.
- `Ainos`: la ciudad tracia de la desembocadura del Hebro no es el monte de Cefalonia.
- `Kourion`: la ciudad chipriota no es el monte de Andros.
- `Larisa`: la ciudad tesalia no es la ciudadela de Argos.
- `Pharai`: la ciudad aquea del Peiros no es la ciudad mesenia.
- `Pylos`: el Pylos eleo mencionado en el Peneo no es el mesenio.
- `Kyllēnē`: el puerto de Élide no es el monte o la población arcadia.
- `Asōpos`: cauces de Beocia, Phlious/Sikyōn y Trachis; la personificación debe explicar las versiones locales.
- `Ladōn`: río arcadio, río eleo, antiguo nombre tebano y dragón homónimo; tampoco se borran las tres fichas arcadias importadas.
- `Inakhos`: Argólide, Anfiloquía, afluente del Aqueloo y afluente del Sperkheios requieren identificación explícita.
- `Kēphisos`: ríos ático, beocio y argivo; los dioses y las representaciones locales no se confunden.
- `Pēneios`: Tesalia y Élide; `Pamisos`: Tesalia y Mesenia; `Lēthaios`: Trikka y Creta.
- `Styx`: diosa, río del inframundo y cascada arcadia. La cascada no es una ficha sustituta de la diosa.
- `Ephyra`: ninfa, nombre de Corinto y ciudad tesprota. `Nónacris`: población, no una nueva deidad fluvial.
- `Alceo`: el poeta no es el personaje real llamado Alkaios ya existente.
- `Tetis`: Tēthys y Thetis son figuras distintas.

## Siguientes grupos de altas por inventariar y documentar

1. **Mares, golfos, lagos y estrechos**: Egeo, Adriático, mar de Libia, mar Tracio; golfos de Corinto, Patras, Argólico, Lacónico, Maliaco, Ambracia, Falero, Smyrna y Elaítico; Kōpais, Hylikē y estrechos de Eubea.
2. **Otros dioses fluviales y figuras vinculadas**: Alpheios, Asōpos, Erymanthos, Eurōtās, Ladōn, Neda, Pamisos de Mesenia, Pēneios tesalio, Enipeus, Sperkheios, Inōpos, Kaystros, Hermos, Kaïkos, Maiandros, Strymōn, Hebros y Styx. Revisar por separado los testimonios de los dos Kēphisoi y Titarēsios. `entes:inachos` ya existe y se reutiliza. No se dará un dios a un río por ausencia de una ficha o por semejanza de nombre.
3. **Afluentes y manantiales**: Helissōn, Brentheatēs, Gortynios, Bouphagos y Kladeos; Aroanios y río Kleitōr; Lymax; Oinous, Tiasa y Phellia; Mavrozoumena, Tzamis, Megalo Potami y Serilas; Parapeiros, Serdinē y Vorilas/Megas Melas; Ladōn eleo; Ōeroē; Ēridanos ático; Dirkē y Strophia; Charadros focidio; Apidanos y Onochōnos; Gorgopotamos; Kōkytos físico y Vouvopotamos; Voidomatis, Sarantaporos, Drinos, Bënça y Shushica; Metsovitikos, Zagoritikos, Vardas y Kalarrytikos; Gormos, Tyria, Smolitsa, Veltsistikos y Lagkavitsa; Nileas y Kireas; Vlychia; Geropotamos/Mitropolianos; Limnatis y Kryos; Almyros y Kalogyros; Paktōlos e Hyllos/Phrygios; Mysios, Kēteios y Marsyas; Arda, Tundzha y Angitēs. Algunas menciones son alias o redes encadenadas, no altas independientes automáticas.
4. **Relieves, valles y llanuras**: Lampeia, Pholoē, Titarios, Dindymēnē, Temnos, Rila, Vitosha, Rhodopē, Xirovouni, Antichasia, Giouchtas, Machairas y Kionia; Tempē, Parasōpia, Gides, Mesara, Mesaoria, Katakekaumenē y Teuthrania. Reutilizar los montes y llanuras ya enlazados; no atribuir nombres griegos reconstruidos a denominaciones modernas.
5. **Ciudades y lugares del recorrido**: contrastar cada mención pendiente con el catálogo, especialmente las ciudades que sólo están representadas por una región fechada de tier superior. No confundir Milētos polis con `miletos-900`, que representa una unidad regional.
6. **Referencias modernas**: revisar las equivalencias y el ámbito de nombres como Trikala, Chania, Arta o Heraklion; separar los topónimos modernos que son alias de una localidad antigua de aquellos que necesitan entidad propia. Autores, obras y organismos se enlazan a sus referencias documentales o a fichas existentes, sin atribuirles homónimos incorrectos.

Este inventario guía las próximas tandas; no declara que todas las menciones necesiten una ficha nueva ni que una equivalencia no verificada sea segura.
