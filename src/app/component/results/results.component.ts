//  This file is part of the research.fi API service
//
//  Copyright 2019 Ministry of Education and Culture, Finland
//
//  :author: CSC - IT Center for Science Ltd., Espoo Finland servicedesk@csc.fi
//  :license: MIT

import { Component, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef  } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SearchService } from '../../services/search.service';
import { SortService } from '../../services/sort.service';
import { map, multicast, debounceTime, take, skip } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { TabChangeService } from 'src/app/services/tab-change.service';
import { ResizeService } from 'src/app/services/resize.service';
import { FilterService } from 'src/app/services/filter.service';
import { Subscription, Observable, combineLatest, Subject, merge } from 'rxjs';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss']
})
export class ResultsComponent implements OnInit, OnDestroy, AfterViewInit {
  public searchTerm: any;
  input: Subscription;
  tabData = this.tabChangeService.tabData;
  tab: any = [];
  selectedTabData: any = [];
  public tabValues: any;
  public filterValues: any;
  errorMessage = [];
  pageNumber = 1;
  page: any;
  expandStatus: Array<boolean> = [];
  @ViewChild('singleId') singleId: ElementRef;
  @ViewChild('srHeader') srHeader: ElementRef;
  queryParams: Subscription;
  filters: {year: any[], status: any[], field: any[], juFo: any[], openAccess: any[], internationalCollaboration: any[]};
  mobile: boolean;
  updateFilters: boolean;
  total: number | string;
  currentQueryParams: any;
  init = true;

  totalSub: Subscription;
  combinedRouteParams: Subscription;

  constructor( private searchService: SearchService, private route: ActivatedRoute, private titleService: Title,
               private tabChangeService: TabChangeService, private router: Router, private resizeService: ResizeService,
               private sortService: SortService, private filterService: FilterService, private cdr: ChangeDetectorRef ) {
    this.searchTerm = this.route.snapshot.params.input;
    this.searchService.updateInput(this.searchTerm);
  }

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    // Subscribe to queryParams and send to search service
    this.queryParams = this.route.queryParams.subscribe(params => {
      // Defaults to 1 if no query param provided.
      this.page = +params.page || 1;
      // filters is an object consisting of arrays, empty property arrays represent that no filter is enabled
      this.filters = {year: [params.year].flat().filter(x => x),
                      status: [params.status].flat().filter(x => x),
                      field: [params.field].flat().filter(x => x),
                      juFo: [params.juFo].flat().filter(x => x),
                      openAccess: [params.openAccess].flat().filter(x => x),
                      internationalCollaboration: [params.internationalCollaboration].flat().filter(x => x)};

      this.filterService.updateFilters(this.filters);
      this.sortService.updateSort(params.sort);
      this.searchService.updatePageNumber(this.page);
      // Flag telling search-results to fetch new filtered data
      this.updateFilters = !this.updateFilters;
    });

    // Subscribe to route params and query params in one subscription
    this.combinedRouteParams = combineLatest([this.route.params, this.route.queryParams])
      .pipe(map(results => ({params: results[0], query: results[1]})),
            multicast(new Subject(), s => merge(s.pipe(take(1)),        // First call is instant, after that debounce
                                                s.pipe(skip(1), debounceTime(1)))))
      .subscribe(results => {
        const query = results.query;
        const params = results.params;

        this.page = +query.page || 1;
        this.filters = {year: [query.year].flat().filter(x => x),
                        status: [query.status].flat().filter(x => x),
                        field: [query.field].flat().filter(x => x),
                        juFo: [query.juFo].flat().filter(x => x),
                        openAccess: [query.openAccess].flat().filter(x => x),
                        internationalCollaboration: [query.internationalCollaboration].flat().filter(x => x)};


        const tabChanged = this.tab !== params.tab;
        const searchTermChanged = this.searchTerm !== (params.input || '');

        this.searchTerm = params.input || '';
        this.selectedTabData = this.tabData.filter(tab => tab.link === params.tab)[0];
        // Default to publications if invalid tab
        if (!this.selectedTabData) {
          this.router.navigate(['results/publications']);
          return;
        }

        this.tab = this.selectedTabData.link;

        if (tabChanged) {
          this.tabChangeService.changeTab(this.selectedTabData);
          this.sortService.updateTab(this.selectedTabData.data);
          this.updateTitle(this.selectedTabData);

        }

        if (searchTermChanged) {
          this.searchService.updateInput(this.searchTerm);
        }

        this.sortService.updateSort(query.sort);
        this.searchService.updatePageNumber(this.page);
        this.searchService.updateQueryParams(query);


        this.filterService.updateFilters(this.filters);


        // Flag telling search-results to fetch new filtered data
        this.updateFilters = !this.updateFilters;

        // If init without search bar redirecting, get data
        if (this.init && !this.searchService.redirecting) {
          this.getTabValues();
        // If search bar is redirecting, get data from search service. Get data "async" so result tab runs onChanges twice at startup
        } else if (this.searchService.redirecting) {
          setTimeout(() => {
            this.tabValues = [this.searchService.tabValues];
          }, 1);
        }
        // If new filter data is neeed
        if (searchTermChanged || tabChanged || this.init) {
          // Reset filter values so new tab doesn't try to use previous tab's filters.
          this.filterValues = undefined;
          this.getFilterData();
        }
        // Reset flags
        this.searchService.redirecting = false;
        this.init = false;
      });

    // Subscribe to resize
    this.resizeService.onResize$.subscribe(dims => this.updateMobile(dims.width));
    this.mobile = window.innerWidth < 992;
  }

  // Get total value from search service / pagination
  ngAfterViewInit() {
    this.totalSub = this.searchService.currentTotal.subscribe(total => {
      this.total = total || '';
      // Add thousand separators
      if (this.total) {this.total = total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
      this.cdr.detectChanges();
    });

  }

  navigateToVisualisation() {
    this.router.navigate(['visual/', this.route.snapshot.params.tab, this.searchTerm],
    {queryParams: this.filters});
  }

  getTabValues() {
    this.searchService.getTabValues()
    .pipe(map(data => [data]))
    .subscribe(tabValues => {
      this.tabValues = tabValues;
    },
    error => this.errorMessage = error as any);
  }

  getFilterData() {
    this.searchService.getFilters()
    .pipe(map(data => [data]))
    .subscribe(filterValues => {
      this.filterValues = filterValues;
      // Set the title
      this.updateTitle(this.selectedTabData);
    },
      error => this.errorMessage = error as any);
  }

  updateTitle(tab: { data: string; label: string}) {
    // Update title and <h1> with the information of the currently selected tab
    if (this.tabValues) {
      // Placeholder until real data is available
      const amount = tab.data ? this.tabValues[0].aggregations._index.buckets[tab.data].doc_count : 999;
      this.setTitle(tab.label + ' - (' + amount + ' hakutulosta) - Haku - Tutkimustietovaranto');
    }
    this.srHeader.nativeElement.innerHTML = document.title.split(' - ', 2).join(' - ');
  }

  updateMobile(width) {
    this.mobile = width < 992;
  }

  // Unsubscribe to prevent memory leaks
  ngOnDestroy() {
    this.tabChangeService.changeTab({data: '', label: '', link: ''});
    this.combinedRouteParams.unsubscribe();
    this.totalSub.unsubscribe();
  }

}
