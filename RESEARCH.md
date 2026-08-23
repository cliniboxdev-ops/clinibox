# Clinibox SaaS — Pre-Build Research (August 2026)

Scope: SaaS platform for Clinibox rural deployments in **Peru**, covering telemedicine consults, patient records (EMR), device/kiosk management, and clinic operations. Constraint: **frequently offline** environments. Builder profile: founder with some coding experience, AI-assisted development.

---

## 1. Regulatory landscape (Peru)

### Telehealth
- **Law 30421** (Telehealth Framework Law) + **Supreme Decree 005-2021-SA** (its regulations) define what telehealth services are and who may provide them.
- **Legislative Decree 1490** expanded telehealth scope: detailed definitions of telemedicine services, **e-prescriptions**, and health information sharing.
- Services must be delivered by competent health personnel and comply with data protection/confidentiality law.

### Personal data protection
- **Law 29733** (Personal Data Protection Law) + **Supreme Decree 016-2024-JUS** (in force since March 30, 2025):
  - Informed, express, unequivocal **consent** before processing personal data. Health data is "sensitive data" — strictest tier.
  - **Mandatory Data Protection Officer (DPO)**.
  - **48-hour breach notification**.
  - Enforced by the APDP (data protection authority) with monetary penalties.
- Practical implications: consent capture flows in the app, audit logging, encryption at rest and in transit, a written data-processing register, and care with cross-border hosting (document transfers; prefer a cloud region with contractual safeguards).

### Electronic health records
- **Law 30024** created **RENHICE** (national EHR registry). All public and private facilities must generate electronic health records that can interoperate with RENHICE.
- MINSA has published FHIR-based interoperability guides (the **Dyaku** implementation guide, https://dyaku.minsa.gob.pe/guides/) based on **HL7 FHIR R4**, with the **IPS (International Patient Summary)** document as the national sharing standard.
- **Key decision: model patient data as FHIR resources (Patient, Encounter, Observation, MedicationRequest…) from day one.** Retrofitting FHIR later is expensive; adopting it early makes RENHICE interop, MINSA accreditation, and future integrations near-free.

---

## 2. Build vs. adopt (biggest efficiency lever)

Existing open-source platforms built for exactly this niche:

| Platform | What it is | Fit |
|---|---|---|
| **OpenMRS** | Modular medical-record platform for low-resource settings | Powerful but Java-heavy, needs engineering staff, weak billing/ops |
| **Bahmni** | Hospital-in-a-box on OpenMRS (billing, pharmacy, labs). Runs on LAN offline, syncs to central server | Best "adopt" option for full clinic ops, but heavyweight; hard to turn into *your* multi-tenant SaaS product |
| **OpenSRP** | Mobile-first, **FHIR-native**, fully offline frontline-worker app; used at national scale by ~9 ministries of health | Best reference architecture for the mobile/offline pattern; Android-centric |
| **OpenEMR / HospitalRun** | Lighter open-source EMRs | Less traction in LATAM public health; HospitalRun is dormant |

**Recommendation: custom-build a focused product on a modern offline-first stack, but steal the data model** — use FHIR resources like OpenSRP does, and study Bahmni's LAN-server-plus-sync topology. Adopting Bahmni wholesale would give features fast but would lock the product into a stack that's hard to differentiate, hard to make SaaS-multi-tenant, and hard for a small AI-assisted team to modify. A custom TypeScript stack is the efficient path for a venture-backed product.

---

## 3. Recommended architecture

### Offline-first sync (the core architectural decision)
2026 sync-engine landscape:
- **PowerSync** — managed service syncing **Postgres ⇄ on-device SQLite**. Works fully offline, syncs on reconnect. Most mature/"engineering" option, enterprise-adopted, React Native + web SDKs. **Recommended.**
- **ElectricSQL** — Postgres → local SQLite/PGlite, read-path focused; good but you build more of the write path.
- **RxDB / PouchDB+CouchDB** — the classic option (used by older health apps); PouchDB is aging, only choose if locked into CouchDB.

**Recommended pattern:** each Clinibox unit / clinic device holds a full local SQLite copy of *its* clinic's data (PowerSync sync rules handle per-tenant partitioning), works 100% offline, syncs opportunistically to central Postgres.

### Stack proposal
| Layer | Choice | Why |
|---|---|---|
| Central DB | **Postgres** (Supabase or AWS RDS) | PowerSync requires it; Supabase adds auth + APIs cheaply |
| Sync | **PowerSync** | Managed, offline-first, per-tenant sync rules |
| Clinic/kiosk app | **React Native (Expo)** or PWA with SQLite (wa-sqlite) | One codebase for tablet/kiosk/phone; full offline |
| Admin/doctor portal | **Next.js** web app | Doctors are online-side; standard web is fine |
| Language/stack | **TypeScript end-to-end** | Best AI-assisted-development support, one language |
| Data model | **HL7 FHIR R4** resources (Peru Dyaku profiles, IPS) | RENHICE compliance, national standard |
| Video consults | **Jitsi (self-hosted or JaaS)** for MVP → **LiveKit** if custom low-bandwidth tuning needed | Jitsi = fastest to deploy, adaptive quality; LiveKit = fine-grained bandwidth control, better SDKs |
| Device fleet mgmt | **balenaCloud** (if Clinibox units run Linux/containers) + its OTA updates; **Mender** if only OS/firmware OTA needed; **ThingsBoard** for telemetry dashboards | Container-based fleet ops matches a "distributed computers" fleet |

### Telemedicine under poor connectivity
- WebRTC with adaptive bitrate; design for **audio-first** degradation (drop video, keep audio).
- **Store-and-forward telemedicine** matters as much as live video in rural Peru: capture vitals/photos/notes offline on the Clinibox, sync when possible, doctor reviews asynchronously. Live video is a feature, not the foundation.

---

## 4. Suggested MVP scoping (maps to roadmap M0–M6)

1. **M0–M2 — Foundation:** Postgres + PowerSync + Expo app skeleton; auth; multi-tenant model (org → clinic → device); FHIR Patient/Encounter schema; Spanish-first UI.
2. **M2–M4 — Clinical core:** patient registration, visit capture (vitals, notes, photos), offline queue + sync, consent capture (Ley 29733), audit log.
3. **M4–M6 — Consults + ops:** async store-and-forward doctor review portal (Next.js); Jitsi video consults when bandwidth allows; basic appointments/queue. → **Working prototype milestone.**
4. **Post-MVP:** e-prescriptions (DL 1490), billing, RENHICE/IPS export, balena fleet dashboard, insurer integrations.

## 5. Open questions to resolve
- Where will patient data be hosted? (AWS São Paulo `sa-east-1` is the closest region; confirm cross-border stance under DS 016-2024-JUS — likely fine with consent + safeguards, verify with Peruvian counsel.)
- What OS/hardware do Clinibox units run? (Determines balena vs. Mender vs. custom.)
- MINSA registration path for a private telehealth platform — needs local regulatory consulting (already in roadmap M6–M9 "Regulation" phase).
- Quechua/Aymara localization — later, but keep i18n in from day one.

## Sources
- Telehealth law: https://academic.oup.com/oodh/article/doi/10.1093/oodh/oqae002/7521274 · https://pmc.ncbi.nlm.nih.gov/articles/PMC10252887/ · https://www.lexology.com/library/detail.aspx?g=61e8f32a-500b-4930-bfd3-900cf0fb40e7
- Data protection: https://securiti.ai/peru-data-protection-law/ · https://www.recordinglaw.com/world-laws/world-data-privacy-laws/peru-data-privacy-laws/
- RENHICE / FHIR: https://dyaku.minsa.gob.pe/guides/ · https://davix.ai/en/blog/normativa-historia-clinica-electronica-peru-2026/ · https://www.gob.pe/institucion/minsa/normas-legales/240527-30024
- Sync engines: https://trybuildpilot.com/648-electric-sql-vs-powersync-vs-zero-2026 · https://www.buildmvpfast.com/blog/local-first-software-saas-rxdb-pouchdb-sync-2026
- Open-source EMRs: https://www.bahmni.org/ · https://opensrp.io/ · https://lifebit.ai/blog/a-guide-to-the-most-popular-open-source-emr-systems/
- Video: https://www.forasoft.com/learn/video-streaming/articles-streaming/sfu-comparison-mediasoup-janus-livekit-jitsi-pion · https://trembit.com/blog/webrtc-for-rural-telemedicine-low-bandwidth-architecture-patterns/
- Fleet management: https://www.ics.com/blog/iot-fleet-management-system-torizon-balena-mender · https://www.balena.io/
