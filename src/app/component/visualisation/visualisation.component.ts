//  This file is part of the research.fi API service
//
//  Copyright 2019 Ministry of Education and Culture, Finland
//
//  :author: CSC - IT Center for Science Ltd., Espoo Finland servicedesk@csc.fi
//  :license: MIT

import { Component, OnInit, OnDestroy } from '@angular/core';
import { SearchService } from '../../services/search.service';
import { SortService } from '../../services/sort.service';
import { HttpClient } from '@angular/common/http';
import * as d3 from 'd3';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FilterService } from '../../services/filter.service';

@Component({
  selector: 'app-visualisation',
  templateUrl: './visualisation.component.html',
  styleUrls: ['./visualisation.component.scss']
})
export class VisualisationComponent implements OnInit, OnDestroy {

  visType = 0;

  allData: any;

  apiUrl = this.searchService.apiUrl;
  total = -1;  // Initial value to prevent NaN%
  scrollSize = 1000;
  hierarchy;

  nOfResults = 0;
  searchTerm: string;
  index: string;
  queryParams: Subscription;
  filtersOn: boolean;
  filter: any;
  query: any;
  width = window.innerWidth;
  height = 900;
  radius = Math.min(this.width, this.height) / 6;
  color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, 10 + 1));
  format = d3.format(',d');

  g: any;
  // partition: any;
  root: any;
  arc: any;
  chart: any;
  path: any;
  label: any;
  parent: any;

  constructor(private searchService: SearchService, private http: HttpClient, private route: ActivatedRoute,
              private filterService: FilterService, private sortService: SortService, private router: Router) {
    this.searchTerm = this.route.snapshot.params.input;
    this.searchService.updateInput(this.searchTerm);
    this.index = this.route.snapshot.params.tab;
    this.sortService.updateTab(this.index);
    this.index = this.index.slice(0, -1);

  }

  ngOnInit() {
    this.getFilters();
  }

  swapVis() {
    this.visType = 1 - this.visType;
  }

  partition(data) {
    const root = d3.hierarchy(data, d => d.values)
      .count();
    return d3.partition()
      .size([2 * Math.PI, root.height + 1])
      (root);
  }

  getFilters() {
    this.queryParams = this.route.queryParams.subscribe(params => {
      this.filter = {
        year: [params.year].flat().filter(x => x),
        status: [params.status].flat().filter(x => x),
        field: [params.field].flat().filter(x => x),
        publicationType: [params.publicationType].flat().filter(x => x),
        countryCode: [params.countryCode].flat().filter(x => x),
        lang: [params.lang].flat().filter(x => x),
        juFo: [params.juFo].flat().filter(x => x),
        openAccess: [params.openAccess].flat().filter(x => x),
        internationalCollaboration: [params.internationalCollaboration].flat().filter(x => x)
      };

      this.filterService.updateFilters(this.filter);

      // Check if any filters are selected
      Object.keys(this.filter).forEach(key => this.filtersOn = this.filter[key].length > 0 || this.filtersOn);

      if (this.filtersOn || this.searchTerm) {
        this.filterService.updateFilters(this.filter);
        this.query = this.filterService.constructQuery(this.index, this.searchTerm);
    } else {
      this.query = undefined;
    }
      this.getData();
  });
}

getData() {
  if (this.index !== 'publication' && this.index !== 'funding') {
    return;
  }

  this.getVisualisationData().subscribe((x: any) => {
    this.nOfResults = x.hits.total;
    this.allData = x.aggregations;
  });
}

getVisualisationData() {
  const query = {
    ...(this.query ? { query: this.query } : []),
    size: 0,
    aggs: {
      year: {
        terms: { field: 'publicationYear' },
        aggs: {
          fieldOfScience: {
            terms: { field: 'fields_of_science.nameFiScience.keyword',
                      size: 100 }
          }
        }
      }
    }
  };
  return this.http.post(this.apiUrl + this.index + '/_search?', query);
}

ngOnDestroy() {
  this.queryParams.unsubscribe();
}
}
