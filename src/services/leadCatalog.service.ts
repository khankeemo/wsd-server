import { Service } from "../models/Service";

const defaultServices = [
  {
    name: "Web Development",
    description: "Custom marketing sites, platforms, and business web apps built for growth.",
    price: 2500,
  },
  {
    name: "Mobile App Development",
    description: "Native-feeling mobile experiences for customer products and internal tools.",
    price: 5000,
  },
  {
    name: "UI/UX Design",
    description: "User journeys, interface systems, and high-conversion product design.",
    price: 1800,
  },
  {
    name: "SaaS Development",
    description: "Multi-tenant SaaS products with scalable architecture and admin tooling.",
    price: 8000,
  },
  {
    name: "Maintenance",
    description: "Performance tuning, fixes, support, and long-term product upkeep.",
    price: 900,
  },
];

export const ensureDefaultServices = async () => {
  await Promise.all(
    defaultServices.map((service) =>
      Service.findOneAndUpdate(
        { name: service.name },
        {
          $set: {
            name: service.name,
            description: service.description,
            price: service.price,
            isActive: true,
          },
        },
        { upsert: true, returnDocument: "after" }
      )
    )
  );
};

export const getActiveServices = async () => {
  await ensureDefaultServices();
  return Service.find({ isActive: true }).sort({ name: 1 });
};
