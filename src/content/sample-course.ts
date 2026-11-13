import type { Course } from '../lib/types.ts'

// Fest eingebauter Beispielkurs. Kann durch einen Import mit gleicher ID ersetzt werden.

export const SAMPLE_COURSE: Course = {
  id: 'lernen-lernen',
  title: 'Lernen lernen',
  emoji: '🧠',
  color: 'violett',
  description: 'Was die Forschung über Vergessen, Abrufen und schnelles Lesen weiß.',
  tiles: [
    {
      id: 'vergessenskurve',
      title: 'Die Vergessenskurve',
      emoji: '📉',
      intro: [
        'Wie hat Hermann Ebbinghaus das Vergessen gemessen?',
        'Warum lohnt es sich, Lernen über mehrere Tage zu verteilen?',
      ],
      steps: [
        {
          type: 'text',
          title: 'Ein Forscher lernt Unsinn',
          text:
            'Im Jahr 1885 veröffentlichte der deutsche Psychologe **Hermann Ebbinghaus** ein Buch mit dem schlichten Titel „Über das Gedächtnis“. Darin beschrieb er Versuche, die er an sich selbst durchgeführt hatte. Er lernte lange Listen **sinnloser Silben** wie „DAX“ oder „BUP“ auswendig – bewusst ohne Bedeutung, damit Vorwissen das Ergebnis nicht verfälscht.\n\n' +
            'Später prüfte er, wie viel Zeit er brauchte, um dieselbe Liste erneut zu lernen. Je mehr Zeit er dabei im Vergleich zum ersten Mal sparte, desto mehr war offenbar noch im Gedächtnis. So konnte er das Vergessen zum ersten Mal messen.',
          image: {
            src: 'https://upload.wikimedia.org/wikipedia/commons/9/92/Ebbinghaus2.jpg',
            alt: 'Porträt von Hermann Ebbinghaus',
            credit: 'Hermann Ebbinghaus. Bild: unbekannt, gemeinfrei, via Wikimedia Commons',
          },
        },
        {
          type: 'choice',
          question: 'Warum lernte Ebbinghaus sinnlose Silben?',
          options: [
            'Damit Vorwissen und Bedeutung das Ergebnis nicht beeinflussen',
            'Weil sie sich besonders leicht merken lassen',
            'Weil sie schneller auszusprechen sind als echte Wörter',
            'Um sein Gedächtnis vor dem Versuch aufzuwärmen',
          ],
          answer: 0,
          explanation:
            'Sinnlose Silben haben keine Bedeutung. So konnte Ebbinghaus das reine Behalten messen, ohne dass Vorwissen hilft.',
        },
        {
          type: 'text',
          title: 'Die Kurve',
          text:
            'Trägt man Ebbinghaus’ Ergebnisse in ein Diagramm ein, entsteht eine typische Kurve: Direkt nach dem Lernen geht sehr schnell sehr viel verloren, schon in der ersten Stunde ein großer Teil. Danach wird das Vergessen immer langsamer, und die Kurve flacht ab. Was einige Tage überstanden hat, bleibt eher erhalten.\n\n' +
            'Diese **Vergessenskurve** gehört zu den bekanntesten Befunden der Psychologie. Eine Nachuntersuchung aus dem Jahr 2015 hat sie mit derselben Methode erneut gefunden. Wie steil sie verläuft, hängt allerdings vom Stoff ab: Sinnvolles, gut verstandenes Wissen wird langsamer vergessen als sinnlose Silben.',
          image: {
            src: 'https://upload.wikimedia.org/wikipedia/commons/d/dc/Ebbinghaus_Forgetting_Curve.jpg',
            alt: 'Diagramm der Vergessenskurve: Das Behaltene sinkt anfangs steil und flacht dann ab',
            credit: 'Vergessenskurve. Bild: Nheise (English Wikibooks), CC BY-SA 3.0, via Wikimedia Commons',
          },
        },
        {
          type: 'truefalse',
          statement: 'Laut der Vergessenskurve vergessen wir jeden Tag ungefähr gleich viel.',
          answer: false,
          explanation:
            'Direkt nach dem Lernen geht am meisten verloren. Danach wird das Vergessen immer langsamer.',
        },
        {
          type: 'text',
          title: 'Der Abstandseffekt',
          text:
            'Ebbinghaus bemerkte noch etwas: Wiederholungen, die er über mehrere Tage verteilte, brachten deutlich mehr als dieselbe Mühe an einem Stück. Heute heißt das **Abstandseffekt**, englisch „spacing effect“. Hunderte Studien haben ihn bestätigt – bei Vokabeln ebenso wie bei Fakten und Fertigkeiten.\n\n' +
            'Praktisch heißt das: lieber dreimal zwanzig Minuten an verschiedenen Tagen als eine Stunde am Stück. Je länger du etwas behalten willst, desto größer dürfen die Abstände zwischen den Wiederholungen werden. Lernkarteien wie das **Leitner-System** aus den 1970er-Jahren und viele Lern-Apps nutzen genau dieses Prinzip.',
        },
        {
          type: 'binary',
          question: 'Lea hat eine Stunde Zeit für Vokabeln, die sie in einem Monat können muss. Was hilft ihr mehr?',
          options: ['Dreimal 20 Minuten an verschiedenen Tagen', 'Eine Stunde am Stück am Abend vor der Prüfung'],
          answer: 0,
          explanation:
            'Verteilte Wiederholungen festigen das Gelernte deutlich besser als dieselbe Lernzeit am Stück.',
        },
        {
          type: 'cloze',
          text: 'Die Lernkartei mit mehreren Fächern aus den 1970er-Jahren stammt von Sebastian ___.',
          options: ['Leitner', 'Ebbinghaus', 'Karpicke'],
          answer: 0,
          explanation: 'Sebastian Leitner beschrieb das System 1972 in seinem Buch „So lernt man lernen“.',
        },
      ],
      recap: [
        'Ebbinghaus maß 1885 das Vergessen – an sich selbst und mit sinnlosen Silben.',
        'Direkt nach dem Lernen vergessen wir am meisten, danach immer langsamer.',
        'Über mehrere Tage verteilte Wiederholungen wirken besser als Lernen am Stück.',
      ],
    },
    {
      id: 'testeffekt',
      title: 'Abrufen statt Wiederlesen',
      emoji: '🔁',
      intro: [
        'Was fanden Roediger und Karpicke 2006 heraus?',
        'Warum fühlt sich Wiederlesen besser an, als es wirkt?',
      ],
      steps: [
        {
          type: 'text',
          title: 'Ein einfaches Experiment',
          text:
            '2006 veröffentlichten die Psychologen **Henry Roediger** und **Jeffrey Karpicke** eine viel beachtete Studie. Studierende lasen kurze Sachtexte, etwa über Seeotter. Danach wurden sie aufgeteilt: Die einen lasen den Text noch einmal, die anderen schrieben ohne Vorlage auf, woran sie sich erinnerten – ein Test ohne Note und ohne Rückmeldung.\n\n' +
            'Wurde nach fünf Minuten geprüft, lag die Wiederlese-Gruppe leicht vorn. Nach zwei Tagen und nach einer Woche drehte sich das Bild: Wer sich selbst abgefragt hatte, erinnerte sich deutlich besser. Dieser Vorteil heißt **Testeffekt**.',
        },
        {
          type: 'choice',
          question: 'Was zeigte die Studie von Roediger und Karpicke nach einer Woche?',
          options: [
            'Wer sich selbst abgefragt hatte, erinnerte sich besser',
            'Wer den Text erneut gelesen hatte, erinnerte sich besser',
            'Beide Gruppen erinnerten sich gleich gut',
            'Beide Gruppen hatten fast alles vergessen',
          ],
          answer: 0,
          explanation:
            'Kurzfristig half Wiederlesen ein wenig mehr. Langfristig war das Abrufen klar überlegen.',
        },
        {
          type: 'text',
          title: 'Warum Abrufen wirkt',
          text:
            'Wenn du dich an etwas erinnerst, liest dein Gehirn nicht einfach einen Speicher aus. Der Abruf selbst verändert das Gedächtnis: Die Erinnerung wird gefestigt und lässt sich beim nächsten Mal leichter wiederfinden. Abrufen ist also nicht nur eine Prüfung des Lernens, sondern selbst ein Lernvorgang.\n\n' +
            'Wiederlesen fühlt sich dagegen produktiv an, weil der Text **vertraut** wirkt. Doch Vertrautheit ist nicht dasselbe wie Erinnern. In einem zweiten Versuch derselben Studie schätzten Studierende, die nur gelesen hatten, ihr Wissen sogar höher ein – und schnitten später trotzdem schlechter ab.',
        },
        {
          type: 'truefalse',
          statement:
            'Wer einen Text mehrmals liest, kann meist gut einschätzen, wie viel davon später hängen bleibt.',
          answer: false,
          explanation:
            'Wiederlesen erzeugt ein Gefühl von Vertrautheit. Deshalb überschätzt man leicht, wie viel man später noch weiß.',
        },
        {
          type: 'text',
          title: 'So nutzt du den Testeffekt',
          text:
            'Der Testeffekt lässt sich leicht in den Alltag einbauen. Klappe nach einem Abschnitt das Buch zu und fasse in eigenen Worten zusammen, was drinstand. Beantworte Übungsfragen, bevor du die Lösung ansiehst. Nutze Karteikarten und sprich die Antwort aus, bevor du die Karte umdrehst.\n\n' +
            'Fehler sind dabei kein Problem, sondern Teil des Lernens – besonders dann, wenn du anschließend die richtige Antwort siehst. **Rückmeldung** verstärkt den Effekt. Genau deshalb folgt in Locus auf jeden Leseabschnitt eine Frage: Du liest, rufst ab und bekommst sofort eine Rückmeldung.',
        },
        {
          type: 'choice',
          question: 'Welche Methode nutzt den Testeffekt?',
          options: [
            'Ein Kapitel zuklappen und das Wichtigste aus dem Gedächtnis aufschreiben',
            'Wichtige Sätze farbig markieren',
            'Ein Kapitel dreimal hintereinander lesen',
            'Eine Zusammenfassung Wort für Wort abschreiben',
          ],
          answer: 0,
          explanation:
            'Nur beim Aufschreiben aus dem Gedächtnis rufst du das Wissen aktiv ab. Markieren, Wiederlesen und Abschreiben bleiben passiv.',
        },
        {
          type: 'cloze',
          text: 'Dass Abrufen das Gedächtnis stärker festigt als Wiederlesen, nennt man ___.',
          options: ['Testeffekt', 'Abstandseffekt', 'Vergessenskurve'],
          answer: 0,
          explanation: 'Der Testeffekt: Sich selbst abzufragen ist selbst ein Lernvorgang.',
        },
      ],
      recap: [
        'Sich selbst abzufragen festigt Wissen stärker als Wiederlesen.',
        'Wiederlesen erzeugt Vertrautheit – und damit leicht Selbstüberschätzung.',
        'Fehler beim Abrufen helfen, besonders mit anschließender Rückmeldung.',
      ],
    },
    {
      id: 'speed-reading',
      title: 'Was beim Speed Reading passiert',
      emoji: '👁️',
      intro: ['Wie bewegen sich die Augen beim Lesen?', 'Was macht ein Speed-Reader anders – und was nicht?'],
      steps: [
        {
          type: 'text',
          title: 'Sprünge statt Gleiten',
          text:
            'Beim Lesen gleiten unsere Augen nicht gleichmäßig über die Zeile, auch wenn es sich so anfühlt. Sie springen. Diese schnellen Sprünge heißen **Sakkaden** und dauern nur einige Hundertstelsekunden. Dazwischen ruhen die Augen kurz auf einer Stelle. Das sind die **Fixationen**, meist etwa eine Viertelsekunde lang.\n\n' +
            'Text nehmen wir fast nur während der Fixationen auf. Scharf sehen wir dabei nur wenige Buchstaben links und rechts des Blickpunkts. Deshalb lässt sich eine ganze Seite nicht „auf einen Blick“ lesen, egal wie viel man übt. Ab und zu springen die Augen auch zurück, um etwas noch einmal zu prüfen.',
        },
        {
          type: 'choice',
          question: 'Wann nehmen die Augen beim Lesen Text auf?',
          options: ['Während der Fixationen', 'Während der Sakkaden', 'Nur am Ende jeder Zeile', 'Ohne Unterbrechung'],
          answer: 0,
          explanation:
            'Während der Sprünge wird kaum etwas wahrgenommen. Gelesen wird in den kurzen Ruhephasen dazwischen.',
        },
        {
          type: 'text',
          title: 'RSVP und der Fokusbuchstabe',
          text:
            'Speed-Reader wie der in dieser App drehen das Prinzip um: Nicht die Augen wandern zum Text, sondern der Text kommt zu den Augen. Die Wörter erscheinen nacheinander an derselben Stelle. Das Verfahren heißt **RSVP**, kurz für „Rapid Serial Visual Presentation“.\n\n' +
            'In jedem Wort ist ein Buchstabe rot markiert. Er liegt etwas links der Wortmitte, denn dort erkennen wir Wörter am schnellsten. Psychologen wie Kevin O’Regan haben diese **optimale Betrachtungsposition** genau untersucht. Weil der rote Buchstabe immer an derselben Stelle steht, muss das Auge nicht neu ausgerichtet werden.',
        },
        {
          type: 'truefalse',
          statement: 'Beim RSVP-Lesen erscheinen die Wörter nacheinander an derselben Stelle.',
          answer: true,
          explanation:
            'Genau das bedeutet RSVP: Die Wörter kommen zu den Augen, statt dass die Augen über die Zeile springen.',
        },
        {
          type: 'text',
          title: 'Schneller heißt nicht besser',
          text:
            'Das klingt nach einem Trick ohne Haken, ist es aber nicht. Die meiste Lesezeit steckt nicht in den Augenbewegungen, sondern im **Verstehen**: Wörter erkennen, Sätze zusammensetzen, Gedanken verknüpfen. Das lässt sich nicht beliebig beschleunigen. Studien zeigen: Steigt das Tempo stark, sinkt das Verständnis.\n\n' +
            'Dazu kommt, dass beim RSVP das Zurückspringen wegfällt, mit dem wir sonst Unklarheiten klären. Für Lernstoff gilt deshalb: ein angenehmes Tempo wählen, an schwierigen Stellen bremsen und „Satz zurück“ nutzen. Erwachsene lesen still meist zwischen 200 und 300 Wörtern pro Minute. Das ist ein guter Ausgangspunkt.',
        },
        {
          type: 'choice',
          question: 'Was passiert laut Forschung, wenn das Lesetempo stark steigt?',
          options: [
            'Das Verständnis sinkt',
            'Das Verständnis steigt',
            'Das Verständnis bleibt gleich',
            'Das Gehirn verarbeitet dann mehrere Zeilen gleichzeitig',
          ],
          answer: 0,
          explanation:
            'Verstehen braucht Zeit. Wer deutlich schneller liest, versteht und behält in der Regel weniger.',
        },
        {
          type: 'binary',
          question: 'Du liest einen schwierigen Fachtext zum Lernen. Welches Vorgehen ist sinnvoller?',
          options: ['Angenehmes Tempo, an schweren Stellen bremsen', 'So schnell wie möglich – Hauptsache durch'],
          answer: 0,
          explanation: 'Bei Lernstoff zählt das Verstehen. Zu hohes Tempo kostet Verständnis.',
        },
      ],
      recap: [
        'Die Augen springen in Sakkaden und nehmen Text in Fixationen auf.',
        'RSVP zeigt Wörter nacheinander an einer Stelle, der rote Buchstabe markiert den Blickpunkt.',
        'Schneller lesen kostet Verständnis – für Lernstoff lieber ein moderates Tempo.',
      ],
    },
  ],
}
