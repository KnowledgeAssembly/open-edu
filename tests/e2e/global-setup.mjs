import {
  seedRegistry,
  WIDGET_REGISTRY_DIR,
  WIDGET_ID,
  WIDGET_PUBLISHER,
  WIDGET_VERSION,
  REGISTRY_ID,
} from './registry-store.mjs';

export default async function globalSetup() {
  process.env.OPEN_EDU_WIDGET_REGISTRY = WIDGET_REGISTRY_DIR;
  process.env.OPEN_EDU_WIDGET_REGISTRY_ID = REGISTRY_ID;
  await seedRegistry();
  console.log(
    `[widget-registry] seeded ${WIDGET_PUBLISHER}/${WIDGET_ID}@${WIDGET_VERSION} at ${WIDGET_REGISTRY_DIR}`,
  );
}
