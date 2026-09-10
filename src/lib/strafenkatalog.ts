// Strafenkatalog der Ratinger Skatschützen (Auszug aus der Satzung, Rev. R).
// Reine Nachschlage-Referenz in der App – keine Rechenlogik.

export interface StrafRow {
  text: string
  note?: string
  preis: number
}
export interface StrafGruppe {
  titel: string
  intro?: string
  rows: StrafRow[]
}

export const KATALOG_INTRO =
  'Der Strafenkatalog (ausgenommen „allgemeine Strafen") beginnt mit der Freigabe der ' +
  'Bahn durch den Präsidenten mit den Worten „Männer wie wir … Ratinger Bier" und endet ' +
  'mit dem Verlassen der Kegelbahn. Für ein verlorenes Spiel wird grundsätzlich eine feine ' +
  'Weinbrandbohne oder artgleiche, möglichst abartige Praline gereicht.'

export const KATALOG: StrafGruppe[] = [
  {
    titel: 'Kegelbildstrafen',
    intro: 'Geworfenes Kegelbild – Strafe je nach Bild.',
    rows: [
      { text: 'Stina', preis: 0.1 },
      { text: 'Angelhaken', note: 'links wie rechts', preis: 0.1 },
      { text: 'Kackstuhl ohne Deckel', preis: 0.1 },
      { text: 'Blindenzeichen', preis: 0.1 },
      { text: 'Kackstuhl mit Deckel', preis: 0.1 },
      { text: '</> (Klammer)', note: 'links wie rechts', preis: 0.1 },
      { text: 'Eckfahne', note: 'links wie rechts', preis: 0.1 },
      { text: 'Dominostein', note: 'links wie rechts', preis: 0.1 },
      { text: 'Fallschirmjäger', preis: 0.1 },
      { text: 'Dreieck', note: 'oben wie unten', preis: 0.1 },
      { text: 'Rosette', preis: 0.5 },
      { text: 'Sonnensymbol', note: 'oben wie unten', preis: 0.5 },
      { text: 'Alle Neune', note: 'alle außer Werfer zahlen', preis: 0.5 },
      { text: 'Volle Rosette', preis: 1.0 },
      { text: 'Pacman', note: 'links wie rechts', preis: 1.0 },
      { text: 'Kranzhand', note: 'alle außer Werfer zahlen', preis: 1.0 },
    ],
  },
  {
    titel: 'Kegelstrafen',
    rows: [
      { text: 'Pudel', preis: 0.1 },
      { text: 'Betonwurf', preis: 0.1 },
      { text: 'Kugel titscht nach Abwurf nochmal auf der Bahn auf', preis: 0.1 },
      {
        text: 'Kegelbild',
        note: 'Stina, Kackstuhl o./m. D., </>-Zeichen, Eckfahne, Dominostein, Fallschirmjäger, Dreieck, Angelhaken',
        preis: 0.1,
      },
      { text: 'Erinnerung zum Werfen', preis: 0.1 },
      { text: 'Kegelbild werfen', note: 'Rosette, Sonnensymbol (HHK)', preis: 0.5 },
      { text: 'Werfen, ohne an der Reihe zu sein', preis: 0.5 },
      { text: 'Schnur bzw. Klingel abwerfen', preis: 0.5 },
      { text: 'Weinbrandbohne nicht vernaschen', preis: 0.5 },
      { text: 'Wirft der Kegelbruder alle Neune', note: 'alle anderen zahlen', preis: 0.5 },
      {
        text: 'Wirft der Kegelbruder eine Straße',
        note: 'min. 3 aufeinanderfolgende Zahlen',
        preis: 0.5,
      },
      { text: 'Kegelbild werfen', note: 'Volle Rosette, Pacman', preis: 1.0 },
      { text: 'Wirft der Kegelbruder eine Kranzhand', note: 'alle anderen zahlen', preis: 1.0 },
      { text: 'Verlorenes Spiel', note: 'kann durch Beschluss erhöht werden', preis: 1.0 },
      { text: 'Kugel verlässt die Bahn', note: 'zurück in die Rinne zählt nicht als Pudel', preis: 1.0 },
      { text: 'Kugel an die Decke werfen', preis: 1.0 },
      { text: 'Kugel fallen lassen', preis: 1.0 },
      { text: 'Behinderung beim Wurf', preis: 1.0 },
      { text: 'Durchläufer ohne Ankündigung', note: 'Kugel muss zwei Kegel passieren', preis: 1.0 },
      { text: 'Durchläufer ankündigen und nicht umsetzen', preis: 1.0 },
      { text: 'Kugel wird eingefangen', note: 'erst ab dem Tisch loslaufen; Wurf zählt', preis: 1.0 },
      { text: 'Beim Versuch, die Kugel zu fangen, gescheitert', preis: 1.0 },
      { text: 'Auf der Bahn umfallen', note: 'ohne Fremdeinwirkung', preis: 1.0 },
      { text: 'Kreide schmeißen oder fallen lassen', preis: 1.0 },
      { text: 'Kugel bleibt nach langsamem Wurf auf der Bahn liegen', preis: 2.0 },
    ],
  },
  {
    titel: 'Allgemeine Strafen',
    rows: [
      { text: 'Frauenbesuch eines Skatschützen auf der Bahn', note: 'außer sie zahlt eine Runde', preis: 5.0 },
      { text: 'Strafen nicht rechtzeitig bezahlt', preis: 5.0 },
      { text: 'Erscheinen auf der Kegelbahn ohne Kegelshirt', note: 'Ausnahme Karnevals-/Geburtstagskegeln', preis: 5.0 },
      { text: 'Pudelkönig nimmt am Kegelabend nicht teil', note: 'Ersatz: Nächster in der Thronfolge / Einladender', preis: 5.0 },
      { text: 'Pudelkönig trägt seine Krone nicht', preis: 10.0 },
      { text: 'Vorzeitiges und unbegründetes Beenden des Kegelabends', note: 'ausgelassene Würfe = nicht zu bezahlende Pudel', preis: 5.0 },
      { text: 'Verlust der im privaten Haushalt aufzubewahrenden Satzung', preis: 5.0 },
      { text: 'Unentschuldigtes Fehlen', preis: 5.0 },
      { text: 'Die Satzung beschädigen oder verschmutzen', preis: 5.0 },
      { text: 'Urlaubsgrüße vergessen', preis: 5.0 },
      { text: 'Unentschuldigte Verspätung um mehr als 10 Minuten', preis: 2.0 },
      { text: 'Vortäuschung falscher Tatsachen', preis: 1.0 },
    ],
  },
  {
    titel: 'Tischmanieren',
    rows: [
      { text: 'Kotzen auf die Bahn', preis: 50.0 },
      { text: 'Kotzen allgemein', preis: 2.0 },
      { text: 'Spucken', note: 'wenn nicht kotzen', preis: 1.0 },
      { text: 'Unbegründetes Aussetzen einer Schnapsrunde', note: 'Begründung durch Präsident/Dienstältesten', preis: 1.0 },
      { text: 'Stuhl umwerfen', note: 'kein Kot', preis: 1.0 },
      { text: 'Während des Kegelns an der Theke trinken', preis: 1.0 },
      { text: 'Mehr als 2 volle Getränke vor sich stehen haben', note: 'voll = Glas über 50 % Inhalt', preis: 1.0 },
      { text: 'Unerlaubtes Bestellen nichtalkoholischer Getränke', note: 'auch Mischbiere', preis: 1.0 },
      { text: 'Runde antrinken ohne Freigabe', preis: 1.0 },
      { text: 'Glas umschmeißen', preis: 1.0 },
      { text: 'Besteck fallen lassen', preis: 1.0 },
      { text: 'Bier verschütten', preis: 0.5 },
      { text: 'Besonders abartiges Furzen auf der Bahn', preis: 0.5 },
    ],
  },
]

export const HAUSNUMMER_HINWEIS =
  'Sonderstrafe bei Spielen mit Ergebnistabelle (hohe/niedrige Hausnummer): Dreimal gleiche ' +
  'Wurfzahl oder eine Straße = eine Schnapsrunde für alle, der Ausgebende darf einen Schnaps ' +
  'seiner Wahl bestellen. Ausnahme 3×9 bzw. 3×1: der Werfer bestimmt, wer zahlt. Wer absichtlich ' +
  'in die Rinne wirft, um die Schnapsrunde zu vermeiden, wird trotzdem mit einer Schnapsrunde bestraft.'
