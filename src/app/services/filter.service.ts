//  This file is part of the research.fi API service
//
//  Copyright 2019 Ministry of Education and Culture, Finland
//
//  :author: CSC - IT Center for Science Ltd., Espoo Finland servicedesk@csc.fi
//  :license: MIT

import { Injectable  } from '@angular/core';
import { SortService } from './sort.service';
import { BehaviorSubject } from 'rxjs';
import { StaticDataService} from './static-data.service'

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  yearFilter: any;
  juFoCodeFilter: any;
  fieldFilter: any;
  publicationTypeFilter: any;
  countryCodeFilter: any;
  langFilter: any;
  statusFilter: object;
  fundingAmountFilter: any;
  openAccessFilter: any;
  internationalCollaborationFilter: any;
  currentFilters: any;
  today: string;

  private filterSource = new BehaviorSubject({year: [], field: [], publicationType: [], countryCode: [], lang: [],
    juFo: [], openAccess: [], internationalCollaboration: [], status: [], fundingAmount: []});
  filters = this.filterSource.asObservable();

  updateFilters(filters: {year: any[], field: any[], publicationType: any[], countryCode: any[], lang: any[],
    openAccess: any[], juFo: any[], internationalCollaboration: any[], status: any[], fundingAmount: any[]}) {
    // Create new filters first before sending updated values to components
    this.currentFilters = filters;
    this.createFilters(filters);
    this.filterSource.next(filters);
  }

  constructor(private sortService: SortService, private staticDataService: StaticDataService) { }

  // Filters
  createFilters(filter: any) {
    // Publication
    this.yearFilter = this.filterByYear(filter.year);
    this.juFoCodeFilter = this.filterByJuFoCode(filter.juFo);
    this.fieldFilter = this.filterByFieldOfScience(filter.field);
    this.publicationTypeFilter = this.filterByPublicationType(filter.publicationType);
    this.countryCodeFilter = this.filterByCountryCode(filter.countryCode);
    this.langFilter = this.filterByLang(filter.lang);
    this.openAccessFilter = this.filterByOpenAccess(filter.openAccess);
    this.internationalCollaborationFilter = this.filterByInternationalCollaboration(filter.internationalCollaboration);
    // Funding
    this.statusFilter = this.filterByStatus(filter.status);
    this.fundingAmountFilter = this.filterByFundingAmount(filter.fundingAmount);
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

  filterByPublicationType(type: any) {
    const typeFilters = [];
    type.forEach(value => {
      typeFilters.push({ term : { 'publicationTypeCode.keyword' : value } });
    });
    return typeFilters;
  }

  filterByCountryCode(code: any) {
    const codeFilters = [];
    code.forEach(value => {
      codeFilters.push({ term : { 'publicationCountryCode.keyword' : value } });
    });
    return codeFilters;
  }

  filterByLang(code: any) {
    const res = [];
    const currentTab = this.sortService.currentTab;
    switch (currentTab) {
      case 'publications': {
        code.forEach(value => { res.push({ term : { languageCode : value } }); });
        break;
      }
    }
    return res;
  }

  filterByJuFoCode(code: any) {
    const res = [];
    if (code.includes('top')) {res.push({ term : { 'jufoClassCode.keyword' : 3 } }); }
    if (code.includes('leading')) {res.push({ term : { 'jufoClassCode.keyword' : 2 } }); }
    if (code.includes('basic')) {res.push({ term : { 'jufoClassCode.keyword' : 1 } }); }
    if (code.includes('others')) {res.push({ term : { 'jufoClassCode.keyword' : 0 } }); }
    if (code.includes('noVal')) {res.push({ term : { 'jufoClassCode.keyword' : ' ' } }); }
    return res;
  }

  filterByOpenAccess(code) {
    const res = [];
    if (code.includes('noAccessInfo')) {res.push({ term : { openAccessCode : 0 } },
      { term : { openAccessCode : -1 } }, { term : { openAccessCode : 9 } }); }
    if (code.includes('openAccess')) {res.push({ term : { openAccessCode : 1 } }); }
    if (code.includes('hybridAccess')) {res.push({ term : { openAccessCode : 2 } }); }
    return res;
  }

  filterByInternationalCollaboration(status: any) {
    if (status.length > 0 && JSON.parse(status)) {
      return { term: { internationalCollaboration: true }	};
    } else { return undefined; }
  }

  // Fundings
  filterByFundingAmount(val) {
    let res;
    switch (JSON.stringify(val)) {
      case '["over100k"]':
      case 'over100k': {
        res = { range: { amount: {gt : 100000 } } };
        break;
      }
      case '["under100k"]':
      case 'under100k': {
        res = { range: { amount: {lte : 100000 } } };
        break;
      }
      default: {
        res = undefined;
      }
    }
    return res;
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

  constructSearch(index: string, searchTerm: string) {
    let querySettings = {};
    querySettings = {
      bool:
      {	should: [
          { multi_match : {
              query: searchTerm,
              analyzer: 'standard',
              fields: this.staticDataService.queryFieldsByIndex(index),
          }}
        ]
      }
    };
    return querySettings;
  }

  constructQuery(index: string, searchTerm: string) {
    const query = this.constructSearch(index, searchTerm);
    return {
        bool: {
          must: [
            { term: { _index: index } },
            ...(searchTerm ? [query] : []),
            ...(index === 'publication' ? (this.juFoCodeFilter.length ? [{ bool: { should: this.juFoCodeFilter } }] : []) : []),
            ...(index === 'publication' ? (this.openAccessFilter.length ? [{ bool: { should: this.openAccessFilter } }] : []) : []),
            ...(index === 'publication' ? (this.internationalCollaborationFilter ? [this.internationalCollaborationFilter] : []) : []),
            ...(index === 'funding' ? (this.statusFilter ? [this.statusFilter] : []) : []),
            ...(index === 'funding' ? (this.fundingAmountFilter ? [this.fundingAmountFilter] : []) : []),
            ...(this.yearFilter.length ? { bool: { should: this.yearFilter } } : this.yearFilter),
            ...(this.fieldFilter.length ? { bool: { should: this.fieldFilter } } : this.fieldFilter),
            ...(this.publicationTypeFilter.length ? { bool: { should: this.publicationTypeFilter } } : this.publicationTypeFilter),
            ...(this.langFilter.length ? { bool: { should: this.langFilter } } : this.langFilter),
            ...(this.countryCodeFilter.length ? { bool: { should: this.countryCodeFilter } } : this.countryCodeFilter)
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

  constructFilterPayload(tab: string, searchTerm: string) {
    const payLoad: any = {
      ...(searchTerm.length ? { query: {
        bool: {
          should: [{
            bool: {
              must: [{ term: { _index: tab.slice(0, -1) }},
              { bool: {
                  should: [{
                    multi_match: {
                      query: searchTerm,
                      analyzer: 'standard',
                      fields: this.staticDataService.queryFieldsByIndex(tab.slice(0, -1)),
                      fuzziness: 'auto'
                    }
                  }]
                }
              }]
            }
          }]
        }
      }} : []),
      size: 0,
      aggs: {
        years: {
          terms: {
            field: this.sortService.yearField,
            size: 50,
            order: { _key : 'desc' }
          }
        },
        countryCode: {
          terms: {
            field: 'publicationCountryCode.keyword'
          }
        },
        languageCode: {
          terms: {
            field: 'languageCode.keyword'
          }
        },
        publicationType: {
          terms: {
            field: 'publicationTypeCode.keyword',
            order: {
              _key: 'asc'
            }
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
        }
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
            },
          }
        };
        break;
      case 'fundings':
        payLoad.aggs.scheme = {
          terms: {
            field: 'keywords.scheme.keyword',
            size: 10
          },
          aggs: {
            field: {
              terms: {
                field: 'keywords.keyword.keyword'
              }
            },
          }
        };
        break;

      default:
        break;
    }
    return payLoad;
  }
}
