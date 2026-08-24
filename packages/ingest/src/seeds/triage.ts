import type { ProtocolDocument } from "../schema.ts";

/**
 * Deterministic field-triage seed protocols.
 *
 * These are structured summaries of published, public algorithms, authored
 * for Clinibox with explicit vital-sign triggers so the trigger engine can
 * evaluate them mechanically. They are decision-support references, not a
 * substitute for clinical training.
 */

const FETCHED_AT = "2026-08-24T00:00:00.000Z";

export const START_ADULT: ProtocolDocument = {
  id: "seed-start-adult",
  title: "START Adult Triage (Simple Triage and Rapid Treatment)",
  lang: "en",
  category: "triage",
  severityTier: 1,
  triggers: [
    {
      description: "Respiratory rate > 30/min → IMMEDIATE (red)",
      parameter: "respiratoryRate",
      op: ">",
      value: 30,
      outcome: "immediate",
    },
    {
      description: "Capillary refill > 2 s or no radial pulse → IMMEDIATE (red)",
      parameter: "capillaryRefillSec",
      op: ">",
      value: 2,
      outcome: "immediate",
    },
    {
      description: "Cannot follow simple commands → IMMEDIATE (red)",
      parameter: "consciousness",
      op: "==",
      value: "not-following-commands",
      outcome: "immediate",
    },
    {
      description: "Not breathing after one airway repositioning → EXPECTANT (black)",
      outcome: "expectant",
    },
    {
      description: "Able to walk → MINOR (green)",
      outcome: "minor",
    },
  ],
  sections: [
    {
      heading: "Overview",
      level: 1,
      paragraphs: [
        "Mass-casualty triage for adults. Assess each patient in under 60 seconds and assign a category: MINOR (green), DELAYED (yellow), IMMEDIATE (red), or EXPECTANT (black). The only interventions during START are airway repositioning and control of severe hemorrhage.",
      ],
      steps: [],
    },
    {
      heading: "Algorithm",
      level: 2,
      paragraphs: [],
      steps: [
        "1. Able to walk? Yes → MINOR (green). Direct to designated area and reassess later.",
        "2. Not walking: is the patient breathing? No → reposition the airway once. Still not breathing → EXPECTANT (black). Breathing after repositioning → IMMEDIATE (red).",
        "3. Breathing: respiratory rate over 30/min → IMMEDIATE (red).",
        "4. Respiratory rate 30/min or less: check perfusion. Capillary refill over 2 seconds or no radial pulse → IMMEDIATE (red); control severe bleeding.",
        "5. Perfusion adequate: check mental status. Cannot follow simple commands → IMMEDIATE (red).",
        "6. Follows commands → DELAYED (yellow).",
      ],
    },
  ],
  source: {
    name: "START — CHEMM/REMM (US Department of Health and Human Services)",
    url: "https://chemm.hhs.gov/startadult.htm",
    license: "Public domain (US Government); Clinibox structured summary",
    fetchedAt: FETCHED_AT,
  },
};

export const WHO_ETAT: ProtocolDocument = {
  id: "seed-who-etat",
  title: "WHO ETAT Pediatric Triage (Emergency Triage Assessment and Treatment)",
  lang: "en",
  category: "pediatric",
  severityTier: 1,
  triggers: [
    {
      description: "Capillary refill > 3 s with cold hands and weak fast pulse → EMERGENCY",
      parameter: "capillaryRefillSec",
      op: ">",
      value: 3,
      outcome: "emergency",
    },
    {
      description: "Coma or convulsing → EMERGENCY",
      parameter: "consciousness",
      op: "==",
      value: "unresponsive",
      outcome: "emergency",
    },
  ],
  sections: [
    {
      heading: "Overview",
      level: 1,
      paragraphs: [
        "Triage of all sick children on arrival: assign EMERGENCY (immediate treatment), PRIORITY (front of queue), or QUEUE (routine). Check emergency signs first — treatment starts before full assessment.",
      ],
      steps: [],
    },
    {
      heading: "Emergency signs (ABCD) — treat immediately",
      level: 2,
      paragraphs: [],
      steps: [
        "Airway/Breathing: obstructed breathing, central cyanosis, or severe respiratory distress.",
        "Circulation: cold hands with capillary refill longer than 3 seconds and weak, fast pulse.",
        "Coma / Convulsions: unconscious child or currently convulsing.",
        "Dehydration (severe): lethargy, sunken eyes, very slow skin pinch return — in a child with diarrhoea.",
      ],
    },
    {
      heading: "Priority signs — front of the queue",
      level: 2,
      paragraphs: [],
      steps: [
        "Tiny baby: any sick infant under 2 months.",
        "Temperature: child is very hot (high fever).",
        "Trauma or other urgent surgical condition.",
        "Severe pallor (palmar pallor).",
        "Poisoning history.",
        "Severe pain.",
        "Respiratory distress (not severe).",
        "Restless, continuously irritable, or lethargic.",
        "Urgent referral from another facility.",
        "Severe malnutrition (visible severe wasting).",
        "Oedema of both feet.",
        "Major burns.",
      ],
    },
    {
      heading: "No emergency or priority signs",
      level: 2,
      paragraphs: ["QUEUE: assess and treat in order of arrival."],
      steps: [],
    },
  ],
  source: {
    name: "WHO — Emergency Triage Assessment and Treatment (ETAT)",
    url: "https://www.who.int/publications/i/item/9241546875",
    license: "Clinibox structured summary of WHO guideline",
    fetchedAt: FETCHED_AT,
  },
};

export const TCCC_MARCH: ProtocolDocument = {
  id: "seed-tccc-march",
  title: "MARCH Field Trauma Sequence (TCCC)",
  lang: "en",
  category: "trauma",
  severityTier: 1,
  contraindications: [
    "Needle decompression and advanced airway maneuvers only by trained providers.",
    "Do not elevate legs or give oral fluids to patients with suspected internal/abdominal trauma.",
  ],
  sections: [
    {
      heading: "Overview",
      level: 1,
      paragraphs: [
        "Field trauma priority sequence from Tactical Combat Casualty Care: treat the fastest killers first — Massive hemorrhage, Airway, Respiration, Circulation, Hypothermia/Head.",
      ],
      steps: [],
    },
    {
      heading: "M — Massive hemorrhage",
      level: 2,
      paragraphs: [],
      steps: [
        "Identify and control life-threatening external bleeding immediately.",
        "Limb bleeding: apply a tourniquet high and tight; note the time.",
        "Junctional/other sites: direct pressure and wound packing (hemostatic gauze if available) with a pressure dressing.",
      ],
    },
    {
      heading: "A — Airway",
      level: 2,
      paragraphs: [],
      steps: [
        "Conscious and talking: airway is open — reassess regularly.",
        "Unconscious: chin lift / jaw thrust; insert nasopharyngeal airway if trained.",
        "Place the casualty in the recovery position to protect the airway.",
      ],
    },
    {
      heading: "R — Respiration",
      level: 2,
      paragraphs: [],
      steps: [
        "Expose and inspect the chest for penetrating wounds.",
        "Seal open chest wounds with an occlusive/vented chest seal.",
        "Progressive respiratory distress after chest trauma: suspect tension pneumothorax — needle decompression by a trained provider.",
      ],
    },
    {
      heading: "C — Circulation",
      level: 2,
      paragraphs: [],
      steps: [
        "Reassess all bleeding-control interventions.",
        "Check radial pulse and mental status as shock indicators.",
        "Establish IV/IO access if trained; give fluids per protocol for shock without head injury.",
        "Suspected pelvic fracture: apply a pelvic binder.",
      ],
    },
    {
      heading: "H — Hypothermia / Head",
      level: 2,
      paragraphs: [],
      steps: [
        "Prevent heat loss: remove wet clothing, insulate from the ground, cover with blankets (head too).",
        "Even in warm climates, trauma patients lose heat — hypothermia worsens bleeding.",
        "Assess and document level of consciousness (AVPU) and pupils; protect the head during movement.",
      ],
    },
  ],
  source: {
    name: "Committee on Tactical Combat Casualty Care (CoTCCC) guidelines",
    url: "https://www.deployedmedicine.com/market/11/content/40",
    license: "Clinibox structured summary of public TCCC guidelines",
    fetchedAt: FETCHED_AT,
  },
};

export const TRIAGE_SEEDS: ProtocolDocument[] = [START_ADULT, WHO_ETAT, TCCC_MARCH];
