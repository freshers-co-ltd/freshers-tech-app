import { describe, expect, it } from 'vitest';
import {
	isRawCleaningQueryResult,
	normaliseCleaningRequest,
} from '@/features/cleanings/services/cleaningRequestService';

describe('isRawCleaningQueryResult', () => {
	it('returns true for a valid raw result with id and tasks array', () => {
		const item = { id: 'cleaning_1', cleaning_tasks: [{ id: 'task_1' }] };
		expect(isRawCleaningQueryResult(item)).toBe(true);
	});

	it('returns false for null', () => {
		expect(isRawCleaningQueryResult(null)).toBe(false);
	});

	it('returns false when cleaning_tasks is missing', () => {
		const item = { id: 'cleaning_1' };
		expect(isRawCleaningQueryResult(item)).toBe(false);
	});

	it('returns false when cleaning_tasks is not an array', () => {
		const item = { id: 'cleaning_1', cleaning_tasks: 'not-an-array' };
		expect(isRawCleaningQueryResult(item)).toBe(false);
	});

	it('returns false for a primitive value', () => {
		expect(isRawCleaningQueryResult(42)).toBe(false);
	});

	it('returns false for an empty object', () => {
		expect(isRawCleaningQueryResult({})).toBe(false);
	});
});

describe('normaliseCleaningRequest', () => {
	it('preserves property as a single object', () => {
		const result = normaliseCleaningRequest({
			id: 'cleaning_1',
			host_id: 'host_1',
			cleaner_id: null,
			property_id: 'prop_1',
			status: 'requested',
			scheduled_start: '2026-07-01T10:00:00Z',
			information: null,
			stocks_included: false,
			service_cost: null,
			cleaner_pay: null,
			clock_in_time: null,
			clock_out_time: null,
			created_at: '2026-06-28T10:00:00Z',
			updated_at: '2026-06-28T10:00:00Z',
			deleted_at: null,
			cleaning_tasks: [],
			property: { id: 'prop_1', address_line_1: '123 Street' },
			cleaner: null,
			evidence: [],
			cleaning_reports: null,
		});

		expect(result.property).toEqual({ id: 'prop_1', address_line_1: '123 Street' });
	});

	it('uses the first element when property is an array', () => {
		const result = normaliseCleaningRequest({
			id: 'cleaning_1',
			host_id: 'host_1',
			cleaner_id: null,
			property_id: 'prop_1',
			status: 'requested',
			scheduled_start: '2026-07-01T10:00:00Z',
			information: null,
			stocks_included: false,
			service_cost: null,
			cleaner_pay: null,
			clock_in_time: null,
			clock_out_time: null,
			created_at: '2026-06-28T10:00:00Z',
			updated_at: '2026-06-28T10:00:00Z',
			deleted_at: null,
			cleaning_tasks: [],
			property: [{ id: 'prop_1' }, { id: 'prop_2' }] as never,
			cleaner: null,
			evidence: [],
			cleaning_reports: null,
		});

		expect(result.property).toEqual({ id: 'prop_1' });
	});

	it('sets property to null when missing', () => {
		const result = normaliseCleaningRequest({
			id: 'cleaning_1',
			host_id: 'host_1',
			cleaner_id: null,
			property_id: 'prop_1',
			status: 'requested',
			scheduled_start: '2026-07-01T10:00:00Z',
			information: null,
			stocks_included: false,
			service_cost: null,
			cleaner_pay: null,
			clock_in_time: null,
			clock_out_time: null,
			created_at: '2026-06-28T10:00:00Z',
			updated_at: '2026-06-28T10:00:00Z',
			deleted_at: null,
			cleaning_tasks: [],
			property: null,
			cleaner: null,
			evidence: [],
			cleaning_reports: null,
		});

		expect(result.property).toBeNull();
	});

	it('preserves cleaner as a single object', () => {
		const result = normaliseCleaningRequest({
			id: 'cleaning_1',
			host_id: 'host_1',
			cleaner_id: 'cln_1',
			property_id: 'prop_1',
			status: 'requested',
			scheduled_start: '2026-07-01T10:00:00Z',
			information: null,
			stocks_included: false,
			service_cost: null,
			cleaner_pay: null,
			clock_in_time: null,
			clock_out_time: null,
			created_at: '2026-06-28T10:00:00Z',
			updated_at: '2026-06-28T10:00:00Z',
			deleted_at: null,
			cleaning_tasks: [],
			property: null,
			cleaner: { full_name: 'Alice Cleaner', avatar_url: null },
			evidence: [],
			cleaning_reports: null,
		});

		expect(result.cleaner).toEqual({ full_name: 'Alice Cleaner', avatar_url: null });
	});

	it('sets cleaner to null when not present', () => {
		const result = normaliseCleaningRequest({
			id: 'cleaning_1',
			host_id: 'host_1',
			cleaner_id: null,
			property_id: 'prop_1',
			status: 'requested',
			scheduled_start: '2026-07-01T10:00:00Z',
			information: null,
			stocks_included: false,
			service_cost: null,
			cleaner_pay: null,
			clock_in_time: null,
			clock_out_time: null,
			created_at: '2026-06-28T10:00:00Z',
			updated_at: '2026-06-28T10:00:00Z',
			deleted_at: null,
			cleaning_tasks: [],
			property: null,
			cleaner: null,
			evidence: [],
			cleaning_reports: null,
		});

		expect(result.cleaner).toBeNull();
	});

	it('preserves report as a single object', () => {
		const result = normaliseCleaningRequest({
			id: 'cleaning_1',
			host_id: 'host_1',
			cleaner_id: 'cln_1',
			property_id: 'prop_1',
			status: 'completed',
			scheduled_start: '2026-07-01T10:00:00Z',
			information: null,
			stocks_included: false,
			service_cost: null,
			cleaner_pay: null,
			clock_in_time: '2026-07-01T10:00:00Z',
			clock_out_time: '2026-07-01T12:00:00Z',
			created_at: '2026-06-28T10:00:00Z',
			updated_at: '2026-07-01T12:00:00Z',
			deleted_at: null,
			cleaning_tasks: [],
			property: null,
			cleaner: null,
			evidence: [],
			cleaning_reports: {
				broken_items_report: 'Broken vase',
				low_supplies_report: null,
				created_at: '2026-07-01T12:00:00Z',
			},
		});

		expect(result.report).toEqual({
			broken_items_report: 'Broken vase',
			low_supplies_report: null,
			created_at: '2026-07-01T12:00:00Z',
		});
	});

	it('uses the first element when report is an array', () => {
		const result = normaliseCleaningRequest({
			id: 'cleaning_1',
			host_id: 'host_1',
			cleaner_id: 'cln_1',
			property_id: 'prop_1',
			status: 'completed',
			scheduled_start: '2026-07-01T10:00:00Z',
			information: null,
			stocks_included: false,
			service_cost: null,
			cleaner_pay: null,
			clock_in_time: '2026-07-01T10:00:00Z',
			clock_out_time: '2026-07-01T12:00:00Z',
			created_at: '2026-06-28T10:00:00Z',
			updated_at: '2026-07-01T12:00:00Z',
			deleted_at: null,
			cleaning_tasks: [],
			property: null,
			cleaner: null,
			evidence: [],
			cleaning_reports: [
				{
					broken_items_report: 'Broken vase',
					low_supplies_report: null,
					created_at: '2026-07-01T12:00:00Z',
				},
				{
					broken_items_report: 'Second report',
					low_supplies_report: null,
					created_at: '2026-07-01T13:00:00Z',
				},
			] as never,
		});

		expect(result.report?.broken_items_report).toBe('Broken vase');
	});

	it('sets report to null when not present', () => {
		const result = normaliseCleaningRequest({
			id: 'cleaning_1',
			host_id: 'host_1',
			cleaner_id: null,
			property_id: 'prop_1',
			status: 'requested',
			scheduled_start: '2026-07-01T10:00:00Z',
			information: null,
			stocks_included: false,
			service_cost: null,
			cleaner_pay: null,
			clock_in_time: null,
			clock_out_time: null,
			created_at: '2026-06-28T10:00:00Z',
			updated_at: '2026-06-28T10:00:00Z',
			deleted_at: null,
			cleaning_tasks: [],
			property: null,
			cleaner: null,
			evidence: [],
			cleaning_reports: null,
		});

		expect(result.report).toBeNull();
	});

	it('defaults tasks to empty array when cleaning_tasks is null', () => {
		const result = normaliseCleaningRequest({
			id: 'cleaning_1',
			host_id: 'host_1',
			cleaner_id: null,
			property_id: 'prop_1',
			status: 'requested',
			scheduled_start: '2026-07-01T10:00:00Z',
			information: null,
			stocks_included: false,
			service_cost: null,
			cleaner_pay: null,
			clock_in_time: null,
			clock_out_time: null,
			created_at: '2026-06-28T10:00:00Z',
			updated_at: '2026-06-28T10:00:00Z',
			deleted_at: null,
			cleaning_tasks: null as never,
			property: null,
			cleaner: null,
			evidence: [],
			cleaning_reports: null,
		});

		expect(result.tasks).toEqual([]);
	});

	it('defaults evidence to empty array when missing', () => {
		const result = normaliseCleaningRequest({
			id: 'cleaning_1',
			host_id: 'host_1',
			cleaner_id: null,
			property_id: 'prop_1',
			status: 'requested',
			scheduled_start: '2026-07-01T10:00:00Z',
			information: null,
			stocks_included: false,
			service_cost: null,
			cleaner_pay: null,
			clock_in_time: null,
			clock_out_time: null,
			created_at: '2026-06-28T10:00:00Z',
			updated_at: '2026-06-28T10:00:00Z',
			deleted_at: null,
			cleaning_tasks: [],
			property: null,
			cleaner: null,
			evidence: null as never,
			cleaning_reports: null,
		});

		expect(result.evidence).toEqual([]);
	});
});
