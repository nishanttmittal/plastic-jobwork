/**
 * Plastic Job Work — record schemas.
 *
 * Each schema is the source of truth for a record's fields. The normalizer
 * (makeNormalizer) fills defaults on read, so adding a field later never breaks
 * old records.
 */
import { field } from '../../core/schema/field'
import { todayStr } from '../../core/utils/format'

/**
 * PRODUCTION entry — one molding run (a date + molder + the shift(s) worked +
 * the products returned). Supports multiple products in one shift.
 *   items: [{ productId, pieces, rejects }]
 *   costSnapshot: computed { perProduct:[{productId, costPerPiece, ...}], ... }
 *                 stored at save time so history keeps its locked rates.
 */
export const productionSchema = [
  field({ name: 'entryNo',     label: 'Entry No',   type: 'text',   default: '', required: true }),
  field({ name: 'date',        label: 'Date',       type: 'date',   default: todayStr, required: true }),
  field({ name: 'molderId',    label: 'Molder',     type: 'text',   default: '', required: true }),
  field({ name: 'shifts',      label: 'Shifts',     type: 'number', default: 1, required: true }),
  field({ name: 'items',       label: 'Items',      type: 'list',   default: () => [], required: true }),
  field({ name: 'runnerKg',    label: 'Runner returned (kg)', type: 'number', default: 0 }),
  field({ name: 'rejectsKg',   label: 'Rejects returned (kg)', type: 'number', default: 0 }),
  field({ name: 'burntKg',     label: 'Burnt / purge loss (kg)', type: 'number', default: 0 }),
  field({ name: 'finishedKg',  label: 'Finished weight (kg)', type: 'number', default: 0 }),
  field({ name: 'note',        label: 'Note',       type: 'text',   default: '' }),
  field({ name: 'costSnapshot', label: 'Cost snapshot', type: 'list', default: () => ({}) }),
  field({ name: 'voided',      label: 'Voided',     type: 'toggle', default: false }),
  field({ name: 'voidReason',  label: 'Void reason', type: 'text',  default: '' }),
]

/**
 * ISSUE — compound / masterbatch / nuts handed to a molder (bulk or per-job).
 * Builds the molder's running material balance.
 */
export const issueSchema = [
  field({ name: 'date',       label: 'Date',       type: 'date',   default: todayStr, required: true }),
  field({ name: 'molderId',   label: 'Molder',     type: 'text',   default: '', required: true }),
  field({ name: 'compoundId', label: 'Compound',   type: 'text',   default: '' }),
  field({ name: 'compoundKg', label: 'Compound (kg)', type: 'number', default: 0 }),
  field({ name: 'mbId',       label: 'Masterbatch', type: 'text',  default: '' }),
  field({ name: 'mbKg',       label: 'Masterbatch (kg)', type: 'number', default: 0 }),
  field({ name: 'insertId',   label: 'Nut/Insert', type: 'text',   default: '' }),
  field({ name: 'nutQty',     label: 'Nuts (qty)', type: 'number', default: 0 }),
  field({ name: 'note',       label: 'Note',       type: 'text',   default: '' }),
  field({ name: 'voided',     label: 'Voided',     type: 'toggle', default: false }),
]

/**
 * PAYMENT — money to a molder. kind: 'payment' (settling dues) | 'advance'.
 */
export const paymentSchema = [
  field({ name: 'date',     label: 'Date',   type: 'date',   default: todayStr, required: true }),
  field({ name: 'molderId', label: 'Molder', type: 'text',   default: '', required: true }),
  field({ name: 'amount',   label: 'Amount', type: 'number', default: 0, required: true }),
  field({ name: 'kind',     label: 'Kind',   type: 'select', default: 'payment',
          options: [{ value: 'payment', label: 'Payment' }, { value: 'advance', label: 'Advance' }] }),
  field({ name: 'note',     label: 'Note',   type: 'text',   default: '' }),
  field({ name: 'voided',   label: 'Voided', type: 'toggle', default: false }),
]

/** App user for role-based access (used only in cloud mode). */
export const userSchema = [
  field({ name: 'email',  label: 'Email',  type: 'text',   default: '', required: true }),
  field({ name: 'name',   label: 'Name',   type: 'text',   default: '' }),
  field({ name: 'role',   label: 'Role',   type: 'text',   default: 'manager' }),
  field({ name: 'active', label: 'Active', type: 'toggle', default: true }),
]
