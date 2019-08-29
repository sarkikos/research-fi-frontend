//  This file is part of the research.fi API service
//
//  Copyright 2019 Ministry of Education and Culture, Finland
//
//  :author: CSC - IT Center for Science Ltd., Espoo Finland servicedesk@csc.fi
//  :license: MIT

import { Injectable  } from '@angular/core';
import { SortService } from './sort.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  yearFilter: any;
  juFoCodeFilter: any;
  fieldFilter: any;
  statusFilter: object;
  openAccessFilter: any;
  internationalCollaborationFilter: any;
  currentFilters: any;
  today: string;

  private filterSource = new BehaviorSubject({year: [], status: [], field: [], juFo: [], openAccess: [], internationalCollaboration: []});
  filters = this.filterSource.asObservable();

  updateFilters(filters: {year: any[], status: any[], field: any[], openAccess: any[], juFo: any[], internationalCollaboration: any[]}) {
    // Create new filters first before sending updated values to components
    this.currentFilters = filters;
    this.createFilters(filters);
    this.filterSource.next(filters);
  }

  constructor(private sortService: SortService) { }

  // Filters
  createFilters(filter: any) {
    this.yearFilter = this.filterByYear(filter.year);
    this.statusFilter = this.filterByStatus(filter.status);
    this.juFoCodeFilter = this.filterByJuFoCode(filter.juFo);
    this.fieldFilter = this.filterByFieldOfScience(filter.field);
    this.openAccessFilter = this.filterByOpenAccess(filter.openAccess)
    this.internationalCollaborationFilter = this.filterByInternationalCollaboration(filter.internationalCollaboration);
  }

  filterByYear(filter: any) {
    const res = [];
    const currentTab = this.sortService.currentTab;
    switch (currentTab) {
      case 'fundings': {
        filter.forEach(value => { res.push({ term : { fundingStartYear : value } }); });
        break;
      }
      case 'publications': {
        filter.forEach(value => { res.push({ term : { publicationYear : value } }); });
        break;
      }
    }
    return res;
  }

  filterByFieldOfScience(field: any) {
    const fieldFilters = [];
    field.forEach(value => {
      fieldFilters.push({ term : { 'fields_of_science.nameFiScience.keyword' : value } });
    });
    return fieldFilters;
  }

  filterByJuFoCode(code: any) {
    const res = [];
    if (code.length === 0) {res.push({ exists : { field : 'jufoClassCode' } }); }
    if (code.includes('top')) {res.push({ term : { 'jufoClassCode.keyword' : 3 } }); }
    if (code.includes('leading')) {res.push({ term : { 'jufoClassCode.keyword' : 2 } }); }
    if (code.includes('basic')) {res.push({ term : { 'jufoClassCode.keyword' : 1 } }); }
    if (code.includes('others')) {res.push({ term : { 'jufoClassCode.keyword' : 0 } }); }
    if (code.includes('noVal')) {res.push({ term : { 'jufoClassCode.keyword' : ' ' } }); }
    return res;
  }

  filterByOpenAccess(code) {
    const res = [];
    if (code.length === 0) {res.push({ exists : { field : 'openAccessCode' } }); }
    if (code.includes('noAccessInfo')) {res.push({ term : { openAccessCode : 0 } },
      { term : { openAccessCode : -1 } }, { term : { openAccessCode : 9 } }); }
    if (code.includes('openAccess')) {res.push({ term : { openAccessCode : 1 } }); }
    if (code.includes('hybridAccess')) {res.push({ term : { openAccessCode : 2 } }); }
    return res;
  }

  filterByInternationalCollaboration(status: any) {
    if (status.length > 0 && JSON.parse(status)) {
      return { term: { internationalCollaboration: true }	};
    } else { return { exists: { field: 'internationalCollaboration' }	}; }
  }

  // Start & end date filtering
  filterByStatus(status: string) {
    this.today = new Date().toISOString().substr(0, 10).replace('T', ' ');
    let statusFilter;
    switch (JSON.stringify(status)) {
      case '["onGoing"]':
      case '"onGoing"': {
        statusFilter = { range: { fundingEndDate: {gte : '2017-01-01' } } };
        break;
      }
      case '["ended"]':
      case '"ended"': {
        statusFilter = { range: { fundingEndDate: {lte : '2017-01-01' } } };
        break;
      }
      default: {
        statusFilter = undefined;
        break;
      }
    }
    return statusFilter;
  }

  constructQuery(index: string, searchTerm: string) {
    return {
        bool: {
          must: [
            { term: { _index: index } },
            ...(searchTerm ? [{ query_string : { query : searchTerm } }] : []),
            ...(index === 'publication' ? (this.juFoCodeFilter.length ? { bool: { should: this.juFoCodeFilter } } : this.juFoCodeFilter) : []),
            ...(index === 'publication' ? (this.openAccessFilter.length ? { bool: { should: this.openAccessFilter } } : this.openAccessFilter) : []),
            ...(index === 'publication' ? (this.internationalCollaborationFilter ? [this.internationalCollaborationFilter] : []) : []),
            ...(index === 'funding' ? (this.statusFilter ? [this.statusFilter] : []) : []),
            ...(this.yearFilter.length ? { bool: { should: this.yearFilter } } : this.yearFilter),
            ...(this.fieldFilter.length ? { bool: { should: this.fieldFilter } } : this.fieldFilter)
          ],
        }
    };
  }

  // Data for results page
  constructPayload(searchTerm: string, fromPage, sortOrder, tab) {
    const query = this.constructQuery(tab.slice(0, -1), searchTerm);
    return {
      query,
      size: 10,
      from: fromPage,
      sort: sortOrder
    };
  }

  constructFilterPayload(tab: string) {
    const payLoad: any = {
      size: 0,
      aggs: {
        years: {
          terms: {
            field: this.sortService.yearField,
            size: 50,
            order: { _key : 'desc' }
          }
        },
        languageCode: {
          terms: {
            field: 'languageCode.keyword'
          }
        },
        juFo: {
          terms: {
            field: 'jufoClassCode.keyword',
            order: {
              _key: 'desc'
            }
          }
        },
        openAccess: {
          terms: {
            field: 'openAccessCode'
          }
        },
        internationalCollaboration: {
          terms: {
            field: 'internationalCollaboration',
            size: 2
          }
        },
      }
    };
    switch (tab) {
      case 'publications':
        payLoad.aggs.fieldsOfScience = {
          terms: {
            field: 'fields_of_science.nameFiScience.keyword',
            size: 250,
            order: {
              _key: 'asc'
            }
          },
          aggs: {
            fieldId: {
              terms: {
                field: 'fields_of_science.fieldIdScience'
              }
            }
          }
        };
        break;
      case 'fundings':
        break;

      default:
        break;
    }
    return payLoad;
  }
}
