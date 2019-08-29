//  This file is part of the research.fi API service
//
//  Copyright 2019 Ministry of Education and Culture, Finland
//
//  :author: CSC - IT Center for Science Ltd., Espoo Finland servicedesk@csc.fi
//  :license: MIT

import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SortService } from '../../../services/sort.service';

@Component({
  selector: 'app-publications',
  templateUrl: './publications.component.html',
  styleUrls: ['./publications.component.scss']
})
export class PublicationsComponent implements OnInit {
  @Input() resultData: any [];
  expandStatus: Array<boolean> = [];
  sortColumn: string;
  sortDirection: boolean;

  constructor(private router: Router, private route: ActivatedRoute, private sortService: SortService) { }

  ngOnInit() {
    this.sortService.initSort(this.route.snapshot.queryParams.sort || 'yearDesc');
    this.sortColumn = this.sortService.sortColumn;
    this.sortDirection = this.sortService.sortDirection;
  }

  sortBy(sortBy) {
    const activeSort = this.route.snapshot.queryParams.sort;
    const [sortColumn, sortDirection] = this.sortService.sortBy(sortBy, activeSort);

    this.router.navigate([],
      {
        relativeTo: this.route,
        queryParams: { sort: sortColumn + (sortDirection ? 'Desc' : '') },
        queryParamsHandling: 'merge'
      }
    );
  }
}
