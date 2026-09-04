import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- Propriétaire ---------------------------------------------------------
  const email = (process.env.SEED_OWNER_EMAIL ?? "proprietaire@exemple.com")
    .trim()
    .toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD ?? "changeme123";
  const name = process.env.SEED_OWNER_NAME ?? "Propriétaire";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash },
  });
  console.log(`✓ Propriétaire : ${email} (mot de passe mis à jour)`);

  // --- Réglages ------------------------------------------------------------
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      businessName: "Effet Mat — Photo & Vidéo immobilière",
      businessEmail: email,
      timezone: "America/Toronto",
      bufferAfterMin: 30,
      minLeadTimeHours: 24,
      bookingHorizonDays: 60,
      bookingIntroText:
        "Réservez votre séance photo/vidéo directement dans mon horaire. " +
        "Vous recevrez une confirmation par courriel ; la facture suit après la séance.",
    },
  });
  console.log("✓ Réglages initialisés");

  // --- Disponibilités : lundi→vendredi, 9 h–17 h --------------------------
  const existingRules = await prisma.availabilityRule.count();
  if (existingRules === 0) {
    await prisma.availabilityRule.createMany({
      data: [1, 2, 3, 4, 5].map((weekday) => ({
        weekday,
        startMinutes: 9 * 60,
        endMinutes: 17 * 60,
      })),
    });
    console.log("✓ Disponibilités : lun–ven 9 h–17 h");
  }

  // Données de démonstration (forfaits + clients + rendez-vous) : uniquement en
  // développement. En production, lancer le seed sans SEED_DEMO=true.
  if (process.env.SEED_DEMO !== "true") {
    console.log("→ SEED_DEMO absent : compte + réglages + disponibilités seulement.");
    return;
  }

  // --- Forfaits ----------------------------------------------------------
  const packageCount = await prisma.package.count();
  if (packageCount === 0) {
    await prisma.package.createMany({
      data: [
        {
          name: "Photo — Essentiel",
          description: "20 à 25 photos HDR, propriété jusqu'à 1 500 pi².",
          mediaType: "PHOTO",
          durationMin: 60,
          priceCents: 19900,
          color: "#004438",
          deliverables: "Galerie web + fichiers haute résolution sous 24 h.",
          sortOrder: 1,
        },
        {
          name: "Photo + Vidéo — Signature",
          description:
            "35 photos HDR + visite vidéo 60–90 s, propriété jusqu'à 2 500 pi².",
          mediaType: "PHOTO_VIDEO",
          durationMin: 120,
          priceCents: 44900,
          color: "#0a6b57",
          deliverables: "Galerie web, photos HD, vidéo 4K horizontale + verticale.",
          sortOrder: 2,
        },
        {
          name: "Vidéo — Cinématique",
          description: "Visite vidéo cinématique 90–120 s avec stabilisateur.",
          mediaType: "VIDEO",
          durationMin: 90,
          priceCents: 34900,
          color: "#8a8a1f",
          deliverables: "Vidéo 4K + version verticale pour réseaux sociaux.",
          sortOrder: 3,
        },
        {
          name: "Photo drone",
          description: "8 à 12 photos aériennes (selon météo et réglementation).",
          mediaType: "PHOTO",
          durationMin: 45,
          priceCents: 14900,
          color: "#b98900",
          onlineBookable: false,
          sortOrder: 4,
        },
      ],
    });
    console.log("✓ 4 forfaits d'exemple");
  }

  // --- Clients + rendez-vous de démonstration --------------------------
  const clientCount = await prisma.client.count();
  if (clientCount === 0) {
    const marie = await prisma.client.create({
      data: {
        name: "Marie Tremblay",
        company: "Groupe Sutton — Marie Tremblay",
        email: "marie.tremblay@exemple.com",
        phone: "514-555-0142",
        billingAddress: "1200 rue Sherbrooke O, Montréal, QC",
      },
    });
    const jonathan = await prisma.client.create({
      data: {
        name: "Jonathan Roy",
        company: "RE/MAX Platine",
        email: "j.roy@exemple.com",
        phone: "450-555-0199",
      },
    });

    const signature = await prisma.package.findFirst({
      where: { name: { startsWith: "Photo + Vidéo" } },
    });
    const essentiel = await prisma.package.findFirst({
      where: { name: { startsWith: "Photo — Essentiel" } },
    });

    const day = (offset: number, hour: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      d.setHours(hour, 0, 0, 0);
      return d;
    };

    await prisma.booking.create({
      data: {
        clientId: marie.id,
        packageId: signature?.id,
        propertyAddress: "45 av. des Pins, Outremont, QC",
        startAt: day(3, 10),
        endAt: day(3, 12),
        status: "CONFIRMED",
        source: "MANUAL",
        notes: "Condo 2 chambres, stationnement à l'arrière.",
      },
    });
    await prisma.booking.create({
      data: {
        clientId: jonathan.id,
        packageId: essentiel?.id,
        propertyAddress: "8 rue Principale, Saint-Lambert, QC",
        startAt: day(-5, 13),
        endAt: day(-5, 14),
        status: "COMPLETED",
        source: "MANUAL",
      },
    });
    await prisma.booking.create({
      data: {
        clientId: marie.id,
        packageId: essentiel?.id,
        propertyAddress: "220 boul. René-Lévesque, Montréal, QC",
        startAt: day(1, 15),
        endAt: day(1, 16),
        status: "REQUESTED",
        source: "CLIENT",
      },
    });
    console.log("✓ 2 clients + 3 rendez-vous de démonstration");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
