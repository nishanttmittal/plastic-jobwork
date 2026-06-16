/**
 * Plastic Job Work — data access. Wires collections & masters to the repository
 * layer (local storage). Cloud mode (later) swaps these for Firestore via a
 * provider that exposes the same shape.
 */
import { createCollection, createSingleton } from '../../core/db/repository'
import { makeNormalizer } from '../../core/schema/field'
import { productionSchema, issueSchema, paymentSchema, userSchema } from './schema'
import {
  KEYS, SEED_COMPOUNDS, SEED_MASTERBATCH, SEED_INSERTS, SEED_MOLDERS, SEED_PRODUCTS,
} from './config'

/* Transaction collections (one record per movement). */
export const productionRepo = createCollection(KEYS.production, {
  seed: () => [],
  normalize: makeNormalizer(productionSchema),
})
export const issuesRepo = createCollection(KEYS.issues, {
  seed: () => [],
  normalize: makeNormalizer(issueSchema),
})
export const paymentsRepo = createCollection(KEYS.payments, {
  seed: () => [],
  normalize: makeNormalizer(paymentSchema),
})
export const logsRepo = createCollection(KEYS.logs, { seed: () => [] })
export const usersRepo = createCollection(KEYS.users, {
  seed: () => [],
  normalize: makeNormalizer(userSchema),
})

/* Masters — singleton list documents (small, editable in Masters screen). */
export const compoundsStore   = createSingleton(KEYS.compounds,   SEED_COMPOUNDS)
export const masterbatchStore = createSingleton(KEYS.masterbatch, SEED_MASTERBATCH)
export const insertsStore     = createSingleton(KEYS.inserts,     SEED_INSERTS)
export const moldersStore     = createSingleton(KEYS.molders,     SEED_MOLDERS)
export const productsStore    = createSingleton(KEYS.products,     SEED_PRODUCTS)

/* Entry-number counter. */
export const counterStore = createSingleton(KEYS.counter, 0)
