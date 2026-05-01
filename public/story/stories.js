/* ============================================================
   Built-in stories. Each story is a graph of scenes.
   Scene shape: { id, title, text, image, choices: [{label, to}], ending?: {title, desc} }
   ============================================================ */

window.BUILTIN_STORIES = [
  {
    id: "lantern",
    title: "The Lantern Beneath the Sea",
    tagline: "A drowned city stirs. Only your light remembers the way home.",
    mood: "Mystery",
    cover: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&q=80",
    start: "s1",
    scenes: {
      s1: {
        title: "Descent",
        text: "Saltwater hums against the brass diving bell. Below, lanterns flicker in a city that should not exist. The line in your hand goes slack. Above, the surface ship is silent.",
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1600&q=80",
        choices: [
          { label: "Cut the line and swim toward the lights.", to: "s2" },
          { label: "Climb back up the rope and signal the ship.", to: "s3" }
        ]
      },
      s2: {
        title: "The Drowned Avenue",
        text: "Coral has eaten the lampposts. A figure waits at the end of the street, holding a lantern that burns blue. It does not move when you approach.",
        image: "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=1600&q=80",
        choices: [
          { label: "Take the lantern from its hand.", to: "s4" },
          { label: "Speak. Ask who it was, in life.", to: "s5" }
        ]
      },
      s3: {
        title: "The Empty Deck",
        text: "You break the surface. The ship drifts with no one aboard. Only your own diving suit, neatly folded on the deck, where you left it years from now.",
        image: "https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=1600&q=80",
        ending: { title: "The Patient Sea", desc: "You have been here before. You will be here again. The story loops, and you are its tide." }
      },
      s4: {
        title: "Inheritance",
        text: "The lantern is warm. The figure crumbles into salt. A path opens in the water — air where there should be none.",
        image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1600&q=80",
        choices: [
          { label: "Walk the dry path home.", to: "e_home" },
          { label: "Walk deeper. There are more lanterns.", to: "e_keeper" }
        ]
      },
      s5: {
        title: "A Name Returned",
        text: "The figure speaks with your mother's voice. She tells you the way out, and asks you to leave the lantern lit.",
        image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80",
        ending: { title: "Daughter of Tide", desc: "You surface with empty hands and a full heart. Some inheritances are not meant to be carried." }
      },
      e_home: {
        title: "Surface",
        text: "You walk into morning. The lantern fades in your hand, its work done.",
        image: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1600&q=80",
        ending: { title: "The Returned", desc: "You came back. Few do. The sea remembers your name and chooses, this time, to forget it." }
      },
      e_keeper: {
        title: "The Last Lamp",
        text: "Light by light, you walk a road only the drowned have walked. At its end, a chair. A logbook. A lantern, waiting for the next.",
        image: "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1600&q=80",
        ending: { title: "Lanternkeeper", desc: "You take the seat. Somewhere above, a diver is descending. You light the way." }
      }
    }
  },

  {
    id: "starforge",
    title: "Starforge Protocol",
    tagline: "The colony ship woke you early. The captain isn't answering.",
    mood: "Sci-Fi",
    cover: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&q=80",
    start: "s1",
    scenes: {
      s1: {
        title: "Cold Wake",
        text: "Cryo-frost slides off your visor. Three thousand sleepers around you, undisturbed. Red light pulses on the bulkhead. The ship's voice is gone.",
        image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1600&q=80",
        choices: [
          { label: "Head to the bridge.", to: "s2" },
          { label: "Check engineering first.", to: "s3" }
        ]
      },
      s2: {
        title: "The Bridge",
        text: "The captain's chair is empty. The forward viewport shows a planet — green, blue, breathing. We weren't supposed to arrive for another hundred years.",
        image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80",
        choices: [
          { label: "Begin the wake-up sequence.", to: "e_landfall" },
          { label: "Search the captain's logs first.", to: "s4" }
        ]
      },
      s3: {
        title: "Engineering",
        text: "The reactor sings sweetly. Too sweetly. Someone has rerouted everything to life support — for one pod. Yours.",
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80",
        choices: [
          { label: "Restore the original distribution.", to: "s2" },
          { label: "Leave it. Find out who chose you.", to: "s4" }
        ]
      },
      s4: {
        title: "Captain's Log",
        text: "The last entry is from the captain — to you, by name. 'You are the only one who can decide what we become down there. I'm sorry. Pick well.'",
        image: "https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=1600&q=80",
        choices: [
          { label: "Wake everyone. Let the colony decide together.", to: "e_landfall" },
          { label: "Land alone. Build a world worth waking into.", to: "e_eden" }
        ]
      },
      e_landfall: {
        title: "Landfall",
        text: "Three thousand voices, blinking, alive, looking out at a world. The argument begins almost at once. It is good to hear it.",
        image: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1600&q=80",
        ending: { title: "The Council", desc: "You did not choose for them. You let them choose. That, perhaps, is what the captain meant." }
      },
      e_eden: {
        title: "First Light",
        text: "You walk on warm grass. The ship sleeps in orbit, holding the others safe. When they wake, there will be a garden waiting.",
        image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1600&q=80",
        ending: { title: "The Gardener", desc: "Some founders are remembered. You will not be. The garden will be enough." }
      }
    }
  },

  {
    id: "hollow",
    title: "The Hollow Crown",
    tagline: "The king is dead. The crown is laughing.",
    mood: "Fantasy",
    cover: "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1200&q=80",
    start: "s1",
    scenes: {
      s1: {
        title: "Throneroom at Dawn",
        text: "Snow drifts through the broken roof. The old king lies still. The crown sits on the floor between you and your sister, waiting to be picked up.",
        image: "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=1600&q=80",
        choices: [
          { label: "Pick up the crown.", to: "s2" },
          { label: "Let your sister take it.", to: "s3" },
          { label: "Throw it into the snow.", to: "e_winter" }
        ]
      },
      s2: {
        title: "Weight",
        text: "The crown whispers. It knows your name. It knows the names of the seven you would have to kill to keep it.",
        image: "https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?w=1600&q=80",
        choices: [
          { label: "Listen. Begin the list.", to: "e_tyrant" },
          { label: "Refuse. Hand it to your sister.", to: "s3" }
        ]
      },
      s3: {
        title: "Her Reign",
        text: "She lifts the crown without trembling. She is kinder than you. She is also more willing.",
        image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80",
        ending: { title: "The Steward", desc: "You become her shield, her shadow, her conscience. History will not write your name. She will." }
      },
      e_tyrant: {
        title: "Iron Spring",
        text: "The seven die. So do many others. The kingdom thrives, terribly.",
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1600&q=80",
        ending: { title: "The Hollow Crown", desc: "You are remembered with awe and with horror. The crown was right about you. That is the worst part." }
      },
      e_winter: {
        title: "Free",
        text: "The crown lands in the snow. Your sister stares. You walk out of the throneroom and keep walking.",
        image: "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1600&q=80",
        ending: { title: "The Walker", desc: "The kingdom finds another ruler, as kingdoms do. You find a small house, a quiet road, a life. It is enough. It is more than enough." }
      }
    }
  }
];
