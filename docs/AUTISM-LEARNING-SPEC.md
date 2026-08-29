Autism Learning Experience (ALX) 2.0

TEACCH-Informed + Modern ABA-Informed Design System for Arin Learn

Version: 2.0
Product: Arin Learn
Audience: Product Managers, UX Designers, Frontend Engineers, Content Authors, AI Engineers, Special Educators

---

1. Purpose

Arin Learn is an autism-first learning platform designed to help learners prepare for NIOS Open Basic Education through structured, predictable, visually-supported, and personalized learning experiences.

Traditional educational products often optimize for:

- Engagement
- Exploration
- Speed
- Gamification

Arin Learn optimizes for:

- Predictability
- Independence
- Cognitive accessibility
- Emotional safety
- Skill mastery

The platform combines:

- TEACCH (Structured Teaching)
- Modern ABA (Skill Acquisition)
- WCAG Accessibility Standards
- Autism-Specific UX Principles

---

2. Educational Framework

TEACCH

TEACCH principles are used for:

- Information architecture
- Navigation
- Visual schedules
- Work systems
- Executive function support
- Predictability
- Independence

Goal

Reduce anxiety by making learning environments predictable and understandable.

---

Modern ABA

ABA principles are used for:

- Guided learning
- Prompting
- Prompt fading
- Skill acquisition
- Mastery progression
- Positive feedback

Goal

Help learners build skills through structured success experiences.

---

3. ALX Design Principles

---

ALX-1 Predictability

Every screen should feel familiar.

Users should always know:

- Where they are
- What they are doing
- What comes next
- How much remains

Requirements

- Navigation remains fixed.
- Lesson structure never changes.
- Primary actions remain consistent.
- No unexpected interface changes.

---

ALX-2 Visual First

Show before explaining.

Requirements

Every concept begins with:

1. Visual Example
2. Demonstration
3. Explanation
4. Practice

Rule

Images should carry the primary meaning.

Text should support visuals.

---

ALX-3 One Concept at a Time

Never introduce multiple concepts simultaneously.

Each Screen Should Contain

- One learning objective
- One task
- One decision

Example

Good:

Count the apples.

Bad:

Count apples, compare quantities, and solve addition.

---

ALX-4 Visible Progress

Progress must always be visible.

Requirements

Display:

- Step indicators
- Question counts
- Lesson progress
- Completion state

Example

Question 3 of 5

---

ALX-5 Safe Mistakes

Mistakes are part of learning.

Requirements

- Unlimited retries
- No penalties
- No public scoring
- No failure screens

Preferred Language

"Let's try again."

Avoid

"Incorrect."

"Failed."

---

ALX-6 Controlled Sensory Environment

Learners control stimulation.

Requirements

- No autoplay audio
- No autoplay video
- No flashing elements
- No unexpected animations

User Controls

- Audio on/off
- Volume
- Motion reduction
- Contrast adjustment
- Audio speed

---

ALX-7 Routine-Based Learning

Every lesson follows the same structure.

Standard Lesson Flow

1. Learn
2. Practice
3. Quiz
4. Complete

Never change this sequence.

---

ALX-8 Mastery-Based Progression

Progress reflects understanding.

Focus On

- Mastery
- Growth
- Independence

Avoid

- Competitive leaderboards
- Rankings
- Excessive point systems

---

4. TEACCH Structured Learning Architecture

---

ALX-9 Structured Work Systems

Every learning screen must answer four questions.

Question 1

What am I doing?

Example:

Count the apples.

---

Question 2

How much work is there?

Example:

Question 2 of 5

---

Question 3

How do I know I am finished?

Example:

Progress 40%

---

Question 4

What happens next?

Example:

Next: Practice Activity

---

Design Requirement

Every activity screen must visibly communicate all four answers.

---

5. Executive Function Support

---

ALX-10 Executive Function Design

Many autistic learners experience difficulty with:

- Task initiation
- Planning
- Sequencing
- Transitions

The interface must compensate.

---

Always Display

Current Task

Example:

Count Apples

---

Completion Status

Example:

3 of 5 Complete

---

Next Activity

Example:

Next: Quiz

---

Resume Behavior

If a learner leaves:

- Return to the exact activity
- Preserve answers
- Preserve progress

Never restart automatically.

---

6. Transition Design

---

ALX-11 Transition Preparation

Transitions must never be abrupt.

Before changing activities:

Show:

- Current activity completed
- Next activity
- Expected duration
- Start button

---

Example

Great Work

Next: Practice

You will count objects independently.

[Start Practice]

---

Avoid

Automatically launching the next activity.

---

7. ABA-Based Learning Design

---

ALX-12 Prompt Hierarchy

Support should fade as mastery improves.

Prompt Levels

Level 1

Full Demonstration

---

Level 2

Visual Hint

---

Level 3

Partial Hint

---

Level 4

Verbal Cue

---

Level 5

Independent

---

Rule

Never remove support abruptly.

Always fade gradually.

---

ALX-13 Errorless Learning

When introducing new concepts:

Success should be highly likely.

Goal

Build confidence before introducing challenge.

---

ALX-14 Shaping

Complex skills should be broken into smaller skills.

Example

Addition

Count Objects

↓

Combine Groups

↓

Understand +

↓

Solve Addition Problems

---

ALX-15 Reinforcement Framework

Reinforcement should support mastery.

Preferred

- Positive feedback
- Progress visibility
- Mastery recognition

Examples

Great work.

You counted correctly.

You completed the lesson.

---

Avoid

- Slot-machine rewards
- Excessive badges
- Confetti explosions
- Dopamine-heavy gamification

---

8. Independence Tracking

---

ALX-16 Independence Over Accuracy

The system should track:

- Accuracy
- Prompt Usage
- Retry Count
- Hint Usage
- Independence Score

---

Example

Student A

90% accuracy

Required prompts every question

---

Student B

85% accuracy

Completed independently

---

Student B may demonstrate stronger learning progress.

---

9. Visual Schedule System

---

Lesson Schedule

Display on every lesson.

Learn

↓

Practice

↓

Quiz

↓

Complete

---

Rules

Always show:

- Current stage
- Next stage
- Remaining stages

Never hide lesson structure.

---

10. Learning Environment Zones

---

ALX-17 Learning Zones

Each area should have a clear purpose.

---

Learn Zone

Observe and understand concepts.

---

Practice Zone

Guided learning.

---

Quiz Zone

Independent mastery.

---

Calm Zone

Regulation and breaks.

---

Parent Zone

Progress and reporting.

---

Rule

Never mix multiple zones on one screen.

---

11. Calm Zone

---

ALX-18 Self-Regulation Support

Every learner should have access to a safe break space.

Accessible globally.

---

Contains

- Visual timer
- Deep breathing activity
- Calm visuals
- Favorite images
- Optional calming audio

---

Rule

Using Calm Zone is never considered failure.

---

12. Personalization Framework

---

Sensory Profile

Each learner maintains a sensory profile.

Example

interface SensoryProfile {
audioSupport: boolean
visualSupport: "low" | "medium" | "high"
animationTolerance: "low" | "medium" | "high"
readingDensity: "low" | "medium" | "high"
promptLevel: "low" | "medium" | "high"
attentionSpan: "short" | "medium" | "long"
}

---

Adaptations

High Visual Need

- Larger images
- Less text
- More demonstrations

---

High Prompt Need

- Additional hints
- Slower prompt fading

---

Short Attention Span

- Shorter lessons
- More checkpoints
- More breaks

---

13. Visual Design Guidelines

---

Color Principles

The interface should feel calm, warm, and safe.

Preferred Palette

Primary

Soft Blue

---

Secondary

Muted Teal

---

Success

Muted Green

---

Warning

Soft Amber

---

Error Recovery

Soft Coral

---

Background

Warm Off-White

---

Avoid

- Neon colors
- Pure white backgrounds
- Pure black backgrounds
- Flashing color changes

---

Contrast

WCAG AA minimum.

Prefer:

Dark Gray Text

Warm Off-White Background

---

Whitespace

Whitespace should reduce clutter.

Avoid:

Excessive whitespace that increases eye travel distance.

---

14. Typography Guidelines

---

Approved Fonts

- Inter
- Arial
- Verdana
- Atkinson Hyperlegible

Optional Accessibility Mode:

- OpenDyslexic

---

Minimum Sizes

Body Text

16px

---

Question Text

20px+

---

Headings

24px+

---

Alignment

Always left aligned.

Avoid:

- Centered paragraphs
- Justified text

---

15. Interaction Guidelines

---

Touch Targets

Minimum:

48x48px

Preferred:

56x56px

---

Single Primary Action

Each screen should contain one dominant action.

Examples:

Continue Lesson

Submit Answer

Start Practice

---

Feedback

Feedback should be immediate.

Examples

- Gentle highlight
- Soft elevation
- Visual confirmation

Avoid excessive motion.

---

16. Motion Guidelines

---

Motion Principles

Motion should communicate.

Never entertain.

---

Allowed

- Fade transitions
- Progress animations
- Small scale changes

---

Avoid

- Bounce animations
- Infinite loops
- Screen shaking
- Parallax effects

---

Duration

150–300ms

---

Accessibility

Provide Reduce Motion Mode.

---

17. Audio Guidelines

---

Audio Control

Always provide:

- Mute
- Volume
- Replay

---

Voice Characteristics

Voice should be:

- Calm
- Slow
- Neutral
- Clear

Avoid exaggerated excitement.

---

18. Language Guidelines

---

Literal Communication

Use direct instructions.

Good

Count the apples.

Choose the correct answer.

---

Avoid

Let's conquer this challenge.

You're on fire.

---

Sentence Length

Target:

5–12 words

---

Feedback

Good

Let's try again.

Count one more time.

---

Avoid

Wrong.

Invalid.

---

19. AI Tutor Guidelines

---

Communication Rules

AI must:

- Use short sentences
- Use literal language
- Explain one idea at a time
- Avoid sarcasm
- Avoid idioms
- Avoid abstract explanations

---

Teaching Sequence

Always follow:

Show

↓

Explain

↓

Practice

---

Orientation Rule

Before explanations, AI should establish:

- What the learner is doing
- What comes next

Example

You are practicing addition.

After this question, you will do one more.

Let's count these apples.

---

Praise Rules

Good

You counted correctly.

You completed the activity.

---

Avoid

You're a genius.

You're amazing.

---

20. Parent Experience Guidelines

Parents need clarity, not analytics overload.

The dashboard should answer:

- What was learned?
- What improved?
- What was difficult?
- What should be practiced next?

---

21. Success Indicators

The platform succeeds when learners can answer:

1. What am I doing?
2. What comes next?
3. How much is left?
4. How do I know I'm finished?

If a learner cannot answer these questions at any point, the design has failed the TEACCH model.

---

22. Design Review Checklist

Before release verify:

- Predictable layout
- One concept per screen
- Visible progress
- Structured work system present
- Executive function support present
- Transition preparation present
- Large touch targets
- Literal language
- Safe mistake handling
- Audio controls available
- Motion controls available
- Calm Zone accessible
- AI responses follow ALX rules
- Independence tracking implemented

Features that pass accessibility requirements but violate ALX principles should not be considered production-ready.

---

ALX North Star

Create a learning environment that feels safe, predictable, visual, and achievable.

Use TEACCH to reduce anxiety and increase independence.

Use ABA to build mastery through small, achievable successes.

The learner should spend their energy learning concepts, not figuring out how the system works.
