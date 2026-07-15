export interface Exemplar {
  type: string;
  step: string;
  conceptDescription: string;
  content: {
    description: string;
    instructions?: string;
    examples?: string[];
    questions?: { question: string; options: string[]; correctIndex: number }[];
    widgetConfig?: Record<string, unknown>;
  };
  widgetId?: string;
}

export const EXEMPLARS: Exemplar[] = [
  {
    type: 'reading',
    step: 'observe',
    conceptDescription: 'addition_1_10 — Add numbers up to 10',
    content: {
      description: 'Understanding addition',
      instructions: 'Addition means putting two groups together to find the total.',
      examples: [
        '2 apples + 1 apple = 3 apples',
        '3 oranges + 2 oranges = 5 oranges',
        '4 stars + 3 stars = 7 stars',
      ],
    },
  },
  {
    type: 'reading',
    step: 'observe',
    conceptDescription: 'basic_shapes — Identify common shapes',
    content: {
      description: 'Learning about shapes',
      instructions:
        'Shapes are all around us. A circle is round like a wheel. A square has four equal sides like a window.',
      examples: ['A ball is a circle', 'A book is a rectangle', 'A slice of pizza is a triangle'],
    },
  },
  {
    type: 'exercise',
    step: 'guided_practice',
    conceptDescription: 'counting_1_10 — Count objects from 1 to 10',
    content: {
      description: 'Count the objects',
      instructions:
        'Count each group of objects. Start from 1 and point to each object as you count.',
      examples: ['How many stars? ★★★ = 3', 'How many apples? 🍎🍎🍎🍎🍎 = 5'],
    },
  },
  {
    type: 'exercise',
    step: 'guided_practice',
    conceptDescription: 'addition_1_10 — Add two numbers',
    content: {
      description: 'Practice adding numbers',
      instructions: 'Add the numbers together. Use objects to help you count.',
      examples: [
        '2 + 1 = ? Hint: Count 2, then count 1 more',
        '3 + 2 = ? Hint: Count 3, then count 2 more',
      ],
    },
  },
  {
    type: 'exercise',
    step: 'independent_practice',
    conceptDescription: 'addition_1_10 — Add without help',
    content: {
      description: 'Add on your own',
      instructions: 'Solve these addition problems without help.',
      examples: ['4 + 3 = ?', '5 + 2 = ?', '6 + 1 = ?'],
    },
  },
  {
    type: 'quiz',
    step: 'mastery_check',
    conceptDescription: 'addition_1_10 — Check understanding',
    content: {
      description: 'Mastery Check',
      questions: [
        { question: 'What is 2 + 1?', options: ['2', '3', '4', '5'], correctIndex: 1 },
        { question: 'What is 3 + 2?', options: ['4', '5', '6', '7'], correctIndex: 1 },
      ],
    },
  },
  {
    type: 'reflection',
    step: 'positive_completion',
    conceptDescription: 'any concept — encouragement',
    content: {
      description: 'Great work!',
      instructions:
        'You have learned how to add numbers. Think about where you see addition in your daily life.',
    },
  },
  {
    type: 'reading',
    step: 'observe',
    conceptDescription: 'fractions_intro — Understand parts of a whole',
    content: {
      description: 'What is a fraction?',
      instructions:
        'A fraction shows a part of a whole. If a pizza is cut into 4 slices and you take 1, that is one fourth (1/4) of the pizza.',
      examples: [
        '1 slice of pizza cut into 4 pieces = 1/4',
        '1 half of an apple = 1/2',
        '3 quarters of a chocolate bar = 3/4',
      ],
    },
  },
  {
    type: 'exercise',
    step: 'guided_practice',
    conceptDescription: 'fractions_intro — Identify parts of a whole',
    content: {
      description: 'Identify the fraction',
      instructions: 'Look at each picture. What fraction is shaded?',
      examples: [
        'A circle with 1 of 4 parts shaded = 1/4',
        'A rectangle with 2 of 3 parts shaded = 2/3',
      ],
    },
  },
  {
    type: 'quiz',
    step: 'mastery_check',
    conceptDescription: 'fractions_intro — Check understanding of fractions',
    content: {
      description: 'Fractions Quiz',
      questions: [
        {
          question: 'If a pizza has 8 slices and you eat 3, what fraction did you eat?',
          options: ['3/8', '5/8', '8/3', '1/8'],
          correctIndex: 0,
        },
        {
          question: 'Which is larger: 1/2 or 1/4?',
          options: ['1/2', '1/4', 'They are equal', 'Cannot tell'],
          correctIndex: 0,
        },
      ],
    },
  },
  {
    type: 'reflection',
    step: 'positive_completion',
    conceptDescription: 'fractions_intro — Encouragement for fractions',
    content: {
      description: 'Excellent work with fractions!',
      instructions:
        'You now understand how fractions work. Try cutting a fruit into equal parts and naming the fractions.',
    },
  },
  {
    type: 'reading',
    step: 'observe',
    conceptDescription: 'place_value_1_100 — Understand tens and ones',
    content: {
      description: 'Understanding tens and ones',
      instructions:
        'In a two-digit number, the first digit tells how many tens, and the second digit tells how many ones.',
      examples: [
        '23 has 2 tens and 3 ones',
        '47 has 4 tens and 7 ones',
        '90 has 9 tens and 0 ones',
      ],
    },
  },
  {
    type: 'exercise',
    step: 'guided_practice',
    conceptDescription: 'place_value_1_100 — Identify tens and ones',
    content: {
      description: 'Find the tens and ones',
      instructions: 'For each number, tell how many tens and how many ones.',
      examples: ['35 has ___ tens and ___ ones', '61 has ___ tens and ___ ones'],
    },
  },
  {
    type: 'exercise',
    step: 'independent_practice',
    conceptDescription: 'place_value_1_100 — Practice place value',
    content: {
      description: 'Place value practice',
      instructions: 'Write the number that has the given tens and ones.',
      examples: ['4 tens and 2 ones = ?', '7 tens and 9 ones = ?', '3 tens and 0 ones = ?'],
    },
  },
  {
    type: 'quiz',
    step: 'mastery_check',
    conceptDescription: 'place_value_1_100 — Place value quiz',
    content: {
      description: 'Place Value Quiz',
      questions: [
        { question: 'How many tens are in 56?', options: ['5', '6', '56', '0'], correctIndex: 0 },
        {
          question: 'What number has 8 tens and 4 ones?',
          options: ['48', '84', '8', '4'],
          correctIndex: 1,
        },
      ],
    },
  },
  {
    type: 'widget',
    step: 'observe',
    conceptDescription: 'family_types — Identify different family structures',
    content: {
      description: 'Family Types Matching',
      instructions: 'Match each family type to its description.',
      widgetConfig: {
        pairs: [
          { itemA: 'Joint Family', itemB: 'Multiple generations living together' },
          { itemA: 'Nuclear Family', itemB: 'Parents and children only' },
          { itemA: 'Single-Parent Family', itemB: 'One parent raising children' },
        ],
      },
    },
    widgetId: 'core.matching',
  },
  {
    type: 'widget',
    step: 'guided_practice',
    conceptDescription: "girls_education — Issues affecting girls' status",
    content: {
      description: 'Issues Affecting Girls',
      instructions: 'Drag each issue to the correct category.',
      widgetConfig: {
        items: [
          { id: 'i1', label: 'Female infanticide', emoji: '⚠️' },
          { id: 'i2', label: 'Less education for girls', emoji: '📚' },
          { id: 'i3', label: 'Early marriage', emoji: '💍' },
        ],
        targets: [
          { id: 't1', label: 'Social Issue' },
          { id: 't2', label: 'Educational Issue' },
        ],
        expectedPositions: { i1: 't1', i2: 't2', i3: 't1' },
        interactive: true,
      },
    },
    widgetId: 'core.drag-drop',
  },
  {
    type: 'widget',
    step: 'independent_practice',
    conceptDescription: 'respect_elders — Explain the importance of respecting elders',
    content: {
      description: 'Ways to Respect Elders',
      instructions: 'Put the steps in the correct order for showing respect to elders.',
      widgetConfig: {
        items: [
          { id: 's1', label: 'Listen carefully' },
          { id: 's2', label: 'Acknowledge their advice' },
          { id: 's3', label: 'Apply what you learned' },
          { id: 's4', label: 'Thank them' },
        ],
        correctOrder: ['s1', 's2', 's3', 's4'],
        interactive: true,
      },
    },
    widgetId: 'core.sequencing',
  },
  {
    type: 'widget',
    step: 'observe',
    conceptDescription: 'water_cycle — Understand the stages of the water cycle',
    content: {
      description: 'The Water Cycle Process',
      instructions: 'This diagram shows how water moves through the water cycle.',
      widgetConfig: {
        nodes: [
          { id: 'evaporation', title: 'Evaporation', description: 'Water heats up and rises as vapor' },
          { id: 'condensation', title: 'Condensation', description: 'Vapor cools and forms clouds' },
          { id: 'precipitation', title: 'Precipitation', description: 'Water falls as rain or snow' },
          { id: 'collection', title: 'Collection', description: 'Water gathers in rivers, lakes, oceans' },
        ],
        connections: [
          { from: 'evaporation', to: 'condensation', type: 'arrow' },
          { from: 'condensation', to: 'precipitation', type: 'arrow' },
          { from: 'precipitation', to: 'collection', type: 'arrow' },
          { from: 'collection', to: 'evaporation', type: 'arrow' },
        ],
        layout: 'cycle',
        title: 'The Water Cycle',
        interactive: false,
      },
    },
    widgetId: 'science.process-diagram',
  },
  {
    type: 'widget',
    step: 'observe',
    conceptDescription: 'planets — Identify the planets in our solar system',
    content: {
      description: 'Solar System Audio Tour',
      instructions: 'Listen to an overview of the planets in our solar system.',
      widgetConfig: {
        audio: 'planets-overview.mp3',
        title: 'The Solar System',
        showTranscript: true,
        interactive: false,
      },
    },
    widgetId: 'core.audio-player',
  },
  {
    type: 'widget',
    step: 'guided_practice',
    conceptDescription: 'integers_on_number_line — Place integers on a number line',
    content: {
      description: 'Number Line: Integers',
      instructions: 'Identify where each integer falls on the number line.',
      widgetConfig: {
        min: -10,
        max: 10,
        step: 1,
        target: -3,
        mode: 'negative',
        showLabels: true,
        interactive: true,
        hints: ['Start at 0 and count left for negative numbers'],
      },
    },
    widgetId: 'math.number-line',
  },
  {
    type: 'widget',
    step: 'guided_practice',
    conceptDescription: 'french_animals — Learn animal names in French',
    content: {
      description: 'French Animal Vocabulary',
      instructions: 'Flip each card to reveal the French word for the animal.',
      widgetConfig: {
        cards: [
          { front: '🐱 Cat', back: 'le chat', hint: 'Sounds like "shah"' },
          { front: '🐕 Dog', back: 'le chien', hint: 'Sounds like "shee-en"' },
          { front: '🐟 Fish', back: 'le poisson', hint: 'Sounds like "pwah-son"' },
        ],
        mode: 'flip',
        interactive: true,
      },
    },
    widgetId: 'language.flashcard',
  },
  {
    type: 'widget',
    step: 'independent_practice',
    conceptDescription: 'human_body — Label the parts of the human body',
    content: {
      description: 'Human Body Diagram',
      instructions: 'Drag each label to the correct body part on the diagram.',
      widgetConfig: {
        image: 'human-body-outline.svg',
        labels: [
          { id: 'heart', text: 'Heart', target: { x: 45, y: 35 }, description: 'Pumps blood through the body' },
          { id: 'lungs', text: 'Lungs', target: { x: 55, y: 35 }, description: 'Help you breathe' },
          { id: 'brain', text: 'Brain', target: { x: 50, y: 10 }, description: 'Controls the body' },
        ],
        interactive: true,
      },
    },
    widgetId: 'science.label-diagram',
  },
  {
    type: 'widget',
    step: 'observe',
    conceptDescription: 'world_oceans — Identify the major oceans of the world',
    content: {
      description: 'World Oceans Map',
      instructions: 'Explore the map to learn about the five major oceans.',
      widgetConfig: {
        regions: [
          { id: 'pacific', name: 'Pacific Ocean', color: '#3b82f6', description: 'The largest and deepest ocean' },
          { id: 'atlantic', name: 'Atlantic Ocean', color: '#06b6d4', description: 'The second largest ocean' },
          { id: 'indian', name: 'Indian Ocean', color: '#8b5cf6', description: 'The warmest ocean' },
        ],
        labels: true,
        title: 'World Oceans',
        interactive: false,
      },
    },
    widgetId: 'social.map',
  },
];
