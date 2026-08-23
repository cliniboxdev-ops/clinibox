# Clinibox Feature Map — What an Offline Clinic Needs

Modeled on full hospital EMRs (reference: **Chameleon EMR** by Elad Health,
used in 75%+ of Israeli hospitals — admission-to-discharge patient chart,
structured documentation, CPOE orders, allergy/condition alerts, device
integration) and scaled down to what a **rural offline clinic** actually
runs. Gap analysis against the current app as of Aug 2026.

Legend: ✅ built · 🟡 partial · ⬜ not started

## 1. Patient chart (the core, Chameleon's "360° view")

| Capability | Status | Notes |
|---|---|---|
| Patient registration (demographics, DNI) | ✅ | FHIR Patient, offline |
| Clinical timeline (what happened) | ✅ | Event log, History tab |
| Problem list / active diagnoses | ⬜ | FHIR Condition |
| Allergies & intolerances | ⬜ | Needed before any med feature — drives alerts |
| Medications (current, history) | ⬜ | FHIR MedicationStatement |
| Visit notes (SOAP: subjective/objective/assessment/plan) | ⬜ | Structured + free text |
| Vitals capture & flowsheet | 🟡 | Live monitor + recorded assessments; needs manual entry + trends over visits |
| Documents/photos (wounds, referral letters) | ⬜ | Camera capture, offline storage |

## 2. Clinical decision support

| Capability | Status | Notes |
|---|---|---|
| Early-warning scoring (NEWS2) | ✅ | Deterministic engine, tested |
| Triage algorithms (START, WHO ETAT pediatric) | ⬜ | Task #3 seed data |
| Protocol/checklist execution (step-by-step guidance) | ⬜ | After knowledge pipeline |
| Offline knowledge chat | ⬜ | Task #4 |
| Allergy/interaction alerts (Chameleon-style) | ⬜ | Requires allergies + meds modules |

## 3. Orders & treatment (CPOE, scaled down)

| Capability | Status | Notes |
|---|---|---|
| Treatment/next-step plan | 🟡 | Derived next-steps exist; need clinician-authored tasks |
| Medication dispensing record | ⬜ | What was given, dose, lot, who gave it |
| Basic lab/point-of-care test results (glucose, rapid tests) | ⬜ | FHIR Observation, manual entry |

## 4. Care coordination

| Capability | Status | Notes |
|---|---|---|
| Referral to higher-level facility (letter + data package) | ⬜ | Critical for rural care; printable/exportable |
| Teleconsultation (async store-and-forward) | ⬜ | Core roadmap feature |
| Teleconsultation (live video when bandwidth allows) | ⬜ | Jitsi, post-MVP |
| Appointments / follow-up scheduling | ⬜ | Simple recall list first, not full scheduling |

## 5. Public-health & operations (rural-specific, not in hospital EMRs)

| Capability | Status | Notes |
|---|---|---|
| Immunization record + vaccine stock/cold chain | ⬜ | High value in rural Peru (MINSA programs) |
| Medication/supplies stock control | ⬜ | Stock-outs are the #1 rural ops problem |
| Maternal & child health tracking (antenatal, growth) | ⬜ | Standard rural program package |
| Daily register / reporting to MINSA (HIS format) | ⬜ | Posts must report activity upward |

## 6. Platform

| Capability | Status | Notes |
|---|---|---|
| Offline-first local storage | ✅ | AsyncStorage behind repository layer |
| Sync to central server | ⬜ | PowerSync + Supabase; badge already tracks unsynced |
| Multi-user login & roles (nurse, técnico, doctor) | ⬜ | Needed before multi-staff pilots; audit trail depends on it |
| Audit log (who saw/changed what) | ⬜ | Ley 29733 requirement |
| Device/kiosk fleet management | ⬜ | balena, later phase |
| RENHICE/IPS export | ⬜ | FHIR base already in place |

## Suggested build order (value ÷ effort, rural-first)

1. **Visit notes + problem list + allergies** — turns the app from a demo into a usable chart; allergies unlock safe med features.
2. **Medication dispensing + stock control** — the daily reality of a rural post.
3. **Referral package + async teleconsult** — the "connect to a doctor" core of Clinibox's value.
4. **Sync (PowerSync/Supabase) + logins + audit** — required before any real pilot with real patients.
5. **Immunization + MCH programs** — aligns with MINSA priorities, strong sales story to regional health authorities.
6. Protocol checklists + knowledge chat (tasks #3–4) layer on top as differentiators.

Sources: [Chameleon EMR](https://elad-health.com/chameleon-emr/) · [Elad Health](https://elad-health.com/) · [Rural Health Clinics overview](https://www.ruralhealthinfo.org/topics/rural-health-clinics) · [WHO ETAT mHealth in Malawi](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11057765/) · [Vaccine stock management in primary care](https://pmc.ncbi.nlm.nih.gov/articles/PMC6930052/)
