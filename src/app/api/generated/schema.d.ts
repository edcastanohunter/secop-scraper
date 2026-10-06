/**
 * Generado por `npm run gen:api` desde el OpenAPI de SecopScrapper. No editar a mano.
 * Las correcciones al contrato viven en `../models.ts`.
 */

export interface paths {
    "/work-items/{id}/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Marks a work item as completed. */
        post: operations["CompleteWorkItem"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/work-items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Returns a page of work items. */
        get: operations["ListWorkItems"];
        put?: never;
        /** Creates a work item. */
        post: operations["CreateWorkItem"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/work-items/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Returns a single work item. */
        get: operations["GetWorkItemById"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/work-items/{id}/title": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Renames a work item. */
        put: operations["RenameWorkItem"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/stats/by-industry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Counts per industry; a record with several industries counts in each. dateFrom and dateTo are required. */
        get: operations["GetStatsByIndustry"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/stats/by-location": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Counts per department (default) or municipality (needs a department filter). dateFrom and dateTo are required. */
        get: operations["GetStatsByLocation"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/stats/facets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Counts per value of the industry, department, status and source filters, each ignoring its own filter. Without dates, the last 365 days. */
        get: operations["GetStatsFacets"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/stats/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Totals of the records matching the filters, each counted once. Without dates, the last 365 days. */
        get: operations["GetStatsSummary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/stats/timeseries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Counts and totals per day, week or month (default), with zero for periods without records. dateFrom and dateTo are required (3 years at most). */
        get: operations["GetStatsTimeSeries"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/stats/top-entities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** The contracting entities with the most records (limit 1-50, default 10). dateFrom and dateTo are required. */
        get: operations["GetStatsTopEntities"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/meta/freshness": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** When each SECOP dataset last synced successfully. */
        get: operations["GetDataFreshness"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Searches processes and contracts together. */
        get: operations["SearchOpportunities"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/processes/secop2/{sourceId}/enrichment": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Returns the scraped enrichment of a SECOP II process and its status. */
        get: operations["GetEnrichment"];
        put?: never;
        /**
         * Queues the scraping of the public SECOP II page of a process (documents, schedule, offers deadline).
         * @description Off by default (503 Scraping.Disabled). 503 Scraping.HostBlocked carries blockedUntil when the portal refused the scraper. Poll GET on the same route for the result.
         */
        post: operations["RequestEnrichment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/scraping/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Whether the optional scraping is on, whether the portal is blocked, and the last 24 hours of outcomes. */
        get: operations["GetScrapingStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/processes/export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Exports the processes matching the filters as CSV (UTF-8 with BOM, ';'). Paging is ignored. */
        get: operations["ExportProcesses"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/processes/{source}/{sourceId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Returns one process with its related contracts. */
        get: operations["GetProcess"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/processes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Searches procurement processes. Direct contracting is left out unless competitiveOnly=false. */
        get: operations["ListProcesses"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ingestion/runs/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Returns one ingestion run with its progress counters. */
        get: operations["GetIngestionRunById"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ingestion/runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lists ingestion runs, newest first. */
        get: operations["ListIngestionRuns"];
        put?: never;
        /** Queues a SECOP sync run (backfill, incremental, reconcile or refresh-open). */
        post: operations["QueueIngestionRun"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ingestion/checkpoints": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Returns the sync watermark of every dataset. */
        get: operations["ListSyncCheckpoints"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/contracts/export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Exports the contracts matching the filters as CSV (UTF-8 with BOM, ';'). Paging is ignored. */
        get: operations["ExportContracts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/contracts/{source}/{sourceId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Returns one contract. */
        get: operations["GetContract"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/contracts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Searches signed contracts. */
        get: operations["ListContracts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/catalog/location-aliases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Maps a SECOP spelling of a place to a DIVIPOLA municipality. */
        post: operations["CreateLocationAlias"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/catalog/industry-mappings/{prefix}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Maps a UNSPSC prefix (2, 4, 6 or 8 digits) to an industry. */
        put: operations["UpsertIndustryMapping"];
        post?: never;
        /** Removes the industry mapping of a UNSPSC prefix. */
        delete: operations["DeleteIndustryMapping"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/catalog/departments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Returns the DIVIPOLA departments. */
        get: operations["ListDepartments"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/catalog/industries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Returns the industries with the UNSPSC prefixes mapped to each one. */
        get: operations["ListIndustries"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/catalog/municipalities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Returns DIVIPOLA municipalities, optionally filtered by department and name fragment. */
        get: operations["ListMunicipalities"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/catalog/unresolved-locations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Returns the locations the normalizer could not resolve, most frequent first. */
        get: operations["ListUnresolvedLocations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/catalog/divipola/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reloads departments and municipalities from DIVIPOLA (datos.gov.co). */
        post: operations["RefreshDivipola"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/saved-searches": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lists the saved searches of the current user. */
        get: operations["ListSavedSearches"];
        put?: never;
        /**
         * Saves a search of the current user; with a frequency, new matches are emailed.
         * @description The filters are validated like GET processes / GET contracts (400). 422 SavedSearch.LimitReached past Alerts:MaxSavedSearchesPerUser, 422 SavedSearch.VerifiedEmailRequired without a verified email, 409 SavedSearch.NameTaken for a repeated name.
         */
        post: operations["CreateSavedSearch"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/saved-searches/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Gets a saved search of the current user (404 for anyone else's). */
        get: operations["GetSavedSearch"];
        /** Replaces the name, filters and frequency of a saved search; its kind never changes. */
        put: operations["UpdateSavedSearch"];
        post?: never;
        /** Deletes a saved search and its delivery history. */
        delete: operations["DeleteSavedSearch"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/saved-searches/{id}/results": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Runs a saved search: the same page GET processes or GET contracts returns for its filters. */
        get: operations["GetSavedSearchResults"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/saved-searches/{id}/deliveries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lists the alert emails of a saved search, newest first. */
        get: operations["ListAlertDeliveries"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/saved-searches/{id}/pause": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Pauses the alert of a saved search. */
        post: operations["PauseSavedSearch"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/saved-searches/{id}/resume": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Resumes the alert of a saved search. */
        post: operations["ResumeSavedSearch"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/alerts/unsubscribe": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * One-click unsubscribe of an alert email (anonymous; the signed token authorizes it).
         * @description Sets the frequency of the saved search to none. Answers text/html: 200, or 400 for an invalid token.
         */
        get: operations["Unsubscribe"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        AlertDeliveryResponse: {
            /** Format: uuid */
            id: string;
            /** Format: date-time */
            windowFrom: string;
            /** Format: date-time */
            windowTo: string;
            /** Format: int32 */
            matches: number;
            /** Format: int32 */
            included: number;
            status: string;
            error: null | string;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            sentAt: null | string;
        };
        Attribution: {
            text: string;
            license: string;
            licenseUrl: string;
        };
        ContractDetail: {
            source: string;
            sourceId: string;
            processSourceId: null | string;
            reference: null | string;
            description: string;
            processDescription: null | string;
            entityName: string;
            entityNit: null | string;
            location: components["schemas"]["LocationDto"];
            industries: components["schemas"]["IndustryRef"][];
            status: string;
            statusRaw: null | string;
            modality: null | string;
            contractType: null | string;
            /** Format: date-time */
            signedAt: null | string;
            /** Format: date-time */
            startsAt: null | string;
            /** Format: date-time */
            endsAt: null | string;
            /** Format: double */
            value: number | null;
            /** Format: double */
            paidValue: number | null;
            supplierName: null | string;
            supplierNit: null | string;
            supplierIsSme: null | boolean;
            mainUnspsc: null | string;
            unspscCodes: string[];
            url: null | string;
            /** Format: date-time */
            firstSeenAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        ContractSummary: {
            source: string;
            sourceId: string;
            processSourceId: null | string;
            reference: null | string;
            description: string;
            entityName: string;
            location: components["schemas"]["LocationDto"];
            industries: components["schemas"]["IndustryRef"][];
            status: string;
            modality: null | string;
            /** Format: date-time */
            signedAt: null | string;
            /** Format: date-time */
            startsAt: null | string;
            /** Format: date-time */
            endsAt: null | string;
            /** Format: double */
            value: number | null;
            /** Format: double */
            paidValue: number | null;
            supplierName: null | string;
            supplierNit: null | string;
            supplierIsSme: null | boolean;
            url: null | string;
        };
        DataFreshness: {
            lastSyncedAt: {
                [key: string]: null | string;
            };
        };
        DepartmentResponse: {
            code: string;
            name: string;
        };
        EnrichmentDocumentResponse: {
            name: string;
            url: string;
            /** Format: date-time */
            publishedAt: null | string;
        };
        EnrichmentResponse: {
            status: string;
            /** Format: date-time */
            completedAt: null | string;
            /** Format: date-time */
            offersDeadlineAt: null | string;
            documents: components["schemas"]["EnrichmentDocumentResponse"][];
            schedule: components["schemas"]["ScheduleEntryResponse"][];
            error: null | string;
        };
        EntityBucket: {
            entityName: string;
            entityNit: null | string;
            /** Format: int64 */
            count: number;
            /** Format: double */
            totalAmount: number;
        };
        FacetValue: {
            value: string;
            label: string;
            /** Format: int64 */
            count: number;
        };
        Facets: {
            industries: components["schemas"]["FacetValue"][];
            departments: components["schemas"]["FacetValue"][];
            statuses: components["schemas"]["FacetValue"][];
            sources: components["schemas"]["FacetValue"][];
            /** Format: date */
            dateFrom: string;
            /** Format: date */
            dateTo: string;
            attribution: components["schemas"]["Attribution"];
            freshness: components["schemas"]["StatsFreshness"];
        };
        IndustryBucket: {
            industryId: string;
            industryName: string;
            /** Format: int64 */
            count: number;
            /** Format: double */
            totalAmount: number;
        };
        IndustryRef: {
            id: string;
            name: string;
        };
        IndustryResponse: {
            id: string;
            name: string;
            description: null | string;
            prefixes: string[];
        };
        IngestionRunResponse: {
            /** Format: uuid */
            id: string;
            datasetKey: string;
            mode: string;
            status: string;
            /** Format: date-time */
            windowFrom: null | string;
            /** Format: date-time */
            windowTo: null | string;
            /** Format: int32 */
            pages: number;
            /** Format: int32 */
            rowsRead: number;
            /** Format: int32 */
            rowsInserted: number;
            /** Format: int32 */
            rowsUpdated: number;
            /** Format: int32 */
            rowsUnchanged: number;
            /** Format: int32 */
            rowsRejected: number;
            error: null | string;
            requestedBy: null | string;
            /** Format: date-time */
            queuedAt: string;
            /** Format: date-time */
            startedAt: null | string;
            /** Format: date-time */
            finishedAt: null | string;
        };
        LocationBucket: {
            code: null | string;
            name: null | string;
            /** Format: int64 */
            count: number;
            /** Format: double */
            totalAmount: number;
        };
        LocationDto: {
            divipolaCode: null | string;
            municipalityName: null | string;
            departmentCode: null | string;
            departmentName: null | string;
            municipalityRaw: null | string;
            departmentRaw: null | string;
        };
        MunicipalityResponse: {
            divipolaCode: string;
            name: string;
            departmentCode: string;
            departmentName: string;
        };
        OpportunityItem: {
            kind: string;
            source: string;
            sourceId: string;
            title: string;
            entityName: string;
            location: components["schemas"]["LocationDto"];
            industries: components["schemas"]["IndustryRef"][];
            status: string;
            isActive: boolean;
            /** Format: double */
            amount: number | null;
            /** Format: date-time */
            date: null | string;
            /** Format: date-time */
            offersDeadlineAt: null | string;
            url: null | string;
        };
        PagedListOfAlertDeliveryResponse: {
            items: components["schemas"]["AlertDeliveryResponse"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            /** Format: int32 */
            totalPages?: number;
            hasNextPage?: boolean;
            hasPreviousPage?: boolean;
        };
        PagedListOfIngestionRunResponse: {
            items: components["schemas"]["IngestionRunResponse"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            /** Format: int32 */
            totalPages?: number;
            hasNextPage?: boolean;
            hasPreviousPage?: boolean;
        };
        PagedListOfUnresolvedLocationResponse: {
            items: components["schemas"]["UnresolvedLocationResponse"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            /** Format: int32 */
            totalPages?: number;
            hasNextPage?: boolean;
            hasPreviousPage?: boolean;
        };
        PagedListOfWorkItemResponse: {
            items: components["schemas"]["WorkItemResponse"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            /** Format: int32 */
            totalPages?: number;
            hasNextPage?: boolean;
            hasPreviousPage?: boolean;
        };
        ProblemDetails: {
            type?: null | string;
            title?: null | string;
            /** Format: int32 */
            status?: number | null;
            detail?: null | string;
            instance?: null | string;
        };
        ProcessDetail: {
            source: string;
            sourceId: string;
            reference: null | string;
            title: string;
            description: null | string;
            entityName: string;
            entityNit: null | string;
            location: components["schemas"]["LocationDto"];
            industries: components["schemas"]["IndustryRef"][];
            status: string;
            phaseRaw: null | string;
            isActive: boolean;
            isCompetitive: boolean;
            modality: null | string;
            contractType: null | string;
            /** Format: double */
            basePrice: number | null;
            /** Format: date-time */
            publishedAt: null | string;
            /** Format: date-time */
            offersDeadlineAt: null | string;
            awarded: boolean;
            /** Format: double */
            awardedValue: number | null;
            mainUnspsc: null | string;
            unspscCodes: string[];
            url: null | string;
            /** Format: date-time */
            firstSeenAt: string;
            /** Format: date-time */
            updatedAt: string;
            contracts: components["schemas"]["ContractSummary"][];
            enrichment?: null | components["schemas"]["EnrichmentResponse"];
        };
        ProcessSummary: {
            source: string;
            sourceId: string;
            reference: null | string;
            title: string;
            entityName: string;
            location: components["schemas"]["LocationDto"];
            industries: components["schemas"]["IndustryRef"][];
            status: string;
            isActive: boolean;
            isCompetitive: boolean;
            modality: null | string;
            /** Format: double */
            basePrice: number | null;
            /** Format: date-time */
            publishedAt: null | string;
            /** Format: date-time */
            offersDeadlineAt: null | string;
            awarded: boolean;
            /** Format: double */
            awardedValue: number | null;
            url: null | string;
        };
        RefreshDivipolaResult: {
            /** Format: int32 */
            departments: number;
            /** Format: int32 */
            municipalities: number;
        };
        Request: {
            title: string;
            description: null | string;
        };
        Response: {
            /** Format: uuid */
            runId: string;
        };
        SavedSearchFilter: {
            q?: null | string;
            industry?: null | string[];
            department?: null | string[];
            municipality?: null | string[];
            entity?: null | string;
            source?: null | string;
            status?: null | string[];
            onlyActive?: null | boolean;
            competitiveOnly?: null | boolean;
            modality?: null | string[];
            /** Format: double */
            minAmount?: number | null;
            /** Format: double */
            maxAmount?: number | null;
            /** Format: date */
            dateFrom?: null | string;
            /** Format: date */
            dateTo?: null | string;
        };
        SavedSearchResponse: {
            /** Format: uuid */
            id: string;
            name: string;
            kind: string;
            filters: components["schemas"]["SavedSearchFilter"];
            frequency: string;
            isPaused: boolean;
            /** Format: date-time */
            lastAlertAt: null | string;
            /** Format: date-time */
            createdAt: string;
            /** Format: int32 */
            newSinceLastAlert: number;
        };
        ScheduleEntryResponse: {
            milestone: string;
            /** Format: date-time */
            date: null | string;
        };
        ScrapingActivity: {
            /** Format: int32 */
            succeeded: number;
            /** Format: int32 */
            failed: number;
            /** Format: int32 */
            blocked: number;
        };
        ScrapingStatusResponse: {
            enabled: boolean;
            /** Format: date-time */
            blockedUntil: null | string;
            reason: null | string;
            last24h: components["schemas"]["ScrapingActivity"];
        };
        SearchPageOfContractSummary: {
            items: components["schemas"]["ContractSummary"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            totalCountIsCapped: boolean;
            attribution: components["schemas"]["Attribution"];
            freshness: components["schemas"]["DataFreshness"];
        };
        SearchPageOfOpportunityItem: {
            items: components["schemas"]["OpportunityItem"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            totalCountIsCapped: boolean;
            attribution: components["schemas"]["Attribution"];
            freshness: components["schemas"]["DataFreshness"];
        };
        SearchPageOfProcessSummary: {
            items: components["schemas"]["ProcessSummary"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageSize: number;
            /** Format: int32 */
            totalCount: number;
            totalCountIsCapped: boolean;
            attribution: components["schemas"]["Attribution"];
            freshness: components["schemas"]["DataFreshness"];
        };
        StatsFreshness: {
            lastSyncedAt: {
                [key: string]: null | string;
            };
            /** Format: date-time */
            statsRefreshedAt: null | string;
        };
        StatsListOfEntityBucket: {
            items: components["schemas"]["EntityBucket"][];
            attribution: components["schemas"]["Attribution"];
            freshness: components["schemas"]["StatsFreshness"];
        };
        StatsListOfIndustryBucket: {
            items: components["schemas"]["IndustryBucket"][];
            attribution: components["schemas"]["Attribution"];
            freshness: components["schemas"]["StatsFreshness"];
        };
        StatsListOfLocationBucket: {
            items: components["schemas"]["LocationBucket"][];
            attribution: components["schemas"]["Attribution"];
            freshness: components["schemas"]["StatsFreshness"];
        };
        StatsListOfTimeSeriesPoint: {
            items: components["schemas"]["TimeSeriesPoint"][];
            attribution: components["schemas"]["Attribution"];
            freshness: components["schemas"]["StatsFreshness"];
        };
        StatsSummary: {
            /** Format: int64 */
            count: number;
            /** Format: double */
            totalAmount: number;
            /** Format: int64 */
            awardedCount: number | null;
            /** Format: double */
            totalAwarded: number | null;
            /** Format: int64 */
            activeCount: number | null;
            /** Format: date */
            dateFrom: string;
            /** Format: date */
            dateTo: string;
            attribution: components["schemas"]["Attribution"];
            freshness: components["schemas"]["StatsFreshness"];
        };
        SyncCheckpointResponse: {
            datasetKey: string;
            /** Format: date-time */
            watermark: null | string;
            /** Format: date-time */
            backfillCompletedAt: null | string;
            /** Format: date-time */
            lastSuccessAt: null | string;
        };
        TimeSeriesPoint: {
            /** Format: date */
            periodStart: string;
            /** Format: int64 */
            count: number;
            /** Format: double */
            totalAmount: number;
        };
        UnresolvedLocationResponse: {
            departmentRaw: string;
            municipalityRaw: string;
            /** Format: int64 */
            occurrences: number;
            /** Format: date-time */
            firstSeenAt: string;
            /** Format: date-time */
            lastSeenAt: string;
        };
        WorkItemResponse: {
            /** Format: uuid */
            id: string;
            title: string;
            description: null | string;
            status: string;
            /** Format: date-time */
            createdOnUtc: string;
            /** Format: date-time */
            completedOnUtc: null | string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    CompleteWorkItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListWorkItems: {
        parameters: {
            query?: {
                includeCompleted?: boolean;
                page?: number;
                pageSize?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedListOfWorkItemResponse"];
                };
            };
        };
    };
    CreateWorkItem: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Request"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetWorkItemById: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkItemResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    RenameWorkItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Request"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetStatsByIndustry: {
        parameters: {
            query?: {
                kind?: string;
                industry?: string[];
                department?: string[];
                municipality?: string[];
                source?: string;
                status?: string[];
                onlyActive?: boolean;
                competitiveOnly?: boolean;
                modality?: string[];
                dateFrom?: string;
                dateTo?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StatsListOfIndustryBucket"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetStatsByLocation: {
        parameters: {
            query?: {
                kind?: string;
                industry?: string[];
                department?: string[];
                municipality?: string[];
                source?: string;
                status?: string[];
                onlyActive?: boolean;
                competitiveOnly?: boolean;
                modality?: string[];
                dateFrom?: string;
                dateTo?: string;
                level?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StatsListOfLocationBucket"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetStatsFacets: {
        parameters: {
            query?: {
                kind?: string;
                industry?: string[];
                department?: string[];
                municipality?: string[];
                source?: string;
                status?: string[];
                onlyActive?: boolean;
                competitiveOnly?: boolean;
                modality?: string[];
                dateFrom?: string;
                dateTo?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Facets"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetStatsSummary: {
        parameters: {
            query?: {
                kind?: string;
                industry?: string[];
                department?: string[];
                municipality?: string[];
                source?: string;
                status?: string[];
                onlyActive?: boolean;
                competitiveOnly?: boolean;
                modality?: string[];
                dateFrom?: string;
                dateTo?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StatsSummary"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetStatsTimeSeries: {
        parameters: {
            query?: {
                kind?: string;
                industry?: string[];
                department?: string[];
                municipality?: string[];
                source?: string;
                status?: string[];
                onlyActive?: boolean;
                competitiveOnly?: boolean;
                modality?: string[];
                dateFrom?: string;
                dateTo?: string;
                interval?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StatsListOfTimeSeriesPoint"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetStatsTopEntities: {
        parameters: {
            query?: {
                kind?: string;
                industry?: string[];
                department?: string[];
                municipality?: string[];
                source?: string;
                status?: string[];
                onlyActive?: boolean;
                competitiveOnly?: boolean;
                modality?: string[];
                dateFrom?: string;
                dateTo?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StatsListOfEntityBucket"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetDataFreshness: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataFreshness"];
                };
            };
        };
    };
    SearchOpportunities: {
        parameters: {
            query?: {
                q?: string;
                industry?: string[];
                department?: string[];
                municipality?: string[];
                entity?: string;
                source?: string;
                status?: string[];
                modality?: string[];
                minAmount?: number;
                maxAmount?: number;
                dateFrom?: string;
                dateTo?: string;
                sort?: string;
                page?: number;
                pageSize?: number;
                onlyActive?: boolean;
                competitiveOnly?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SearchPageOfOpportunityItem"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetEnrichment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sourceId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrichmentResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    RequestEnrichment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sourceId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Accepted */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrichmentResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetScrapingStatus: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ScrapingStatusResponse"];
                };
            };
        };
    };
    ExportProcesses: {
        parameters: {
            query?: {
                q?: string;
                industry?: string[];
                department?: string[];
                municipality?: string[];
                entity?: string;
                source?: string;
                status?: string[];
                modality?: string[];
                minAmount?: number;
                maxAmount?: number;
                dateFrom?: string;
                dateTo?: string;
                sort?: string;
                page?: number;
                pageSize?: number;
                onlyActive?: boolean;
                competitiveOnly?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetProcess: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                source: string;
                sourceId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProcessDetail"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListProcesses: {
        parameters: {
            query?: {
                q?: string;
                industry?: string[];
                department?: string[];
                municipality?: string[];
                entity?: string;
                source?: string;
                status?: string[];
                modality?: string[];
                minAmount?: number;
                maxAmount?: number;
                dateFrom?: string;
                dateTo?: string;
                sort?: string;
                page?: number;
                pageSize?: number;
                onlyActive?: boolean;
                competitiveOnly?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SearchPageOfProcessSummary"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetIngestionRunById: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IngestionRunResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListIngestionRuns: {
        parameters: {
            query?: {
                datasetKey?: string;
                status?: string;
                page?: number;
                pageSize?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedListOfIngestionRunResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    QueueIngestionRun: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Request"];
            };
        };
        responses: {
            /** @description Accepted */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Response"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListSyncCheckpoints: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SyncCheckpointResponse"][];
                };
            };
        };
    };
    ExportContracts: {
        parameters: {
            query?: {
                q?: string;
                industry?: string[];
                department?: string[];
                municipality?: string[];
                entity?: string;
                source?: string;
                status?: string[];
                modality?: string[];
                minAmount?: number;
                maxAmount?: number;
                dateFrom?: string;
                dateTo?: string;
                sort?: string;
                page?: number;
                pageSize?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetContract: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                source: string;
                sourceId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContractDetail"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListContracts: {
        parameters: {
            query?: {
                q?: string;
                industry?: string[];
                department?: string[];
                municipality?: string[];
                entity?: string;
                source?: string;
                status?: string[];
                modality?: string[];
                minAmount?: number;
                maxAmount?: number;
                dateFrom?: string;
                dateTo?: string;
                sort?: string;
                page?: number;
                pageSize?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SearchPageOfContractSummary"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    CreateLocationAlias: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Request"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    UpsertIndustryMapping: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                prefix: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Request"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    DeleteIndustryMapping: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                prefix: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListDepartments: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DepartmentResponse"][];
                };
            };
        };
    };
    ListIndustries: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IndustryResponse"][];
                };
            };
        };
    };
    ListMunicipalities: {
        parameters: {
            query?: {
                departmentCode?: string;
                q?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MunicipalityResponse"][];
                };
            };
        };
    };
    ListUnresolvedLocations: {
        parameters: {
            query?: {
                page?: number;
                pageSize?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedListOfUnresolvedLocationResponse"];
                };
            };
        };
    };
    RefreshDivipola: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Accepted */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RefreshDivipolaResult"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListSavedSearches: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SavedSearchResponse"][];
                };
            };
        };
    };
    CreateSavedSearch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Request"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SavedSearchResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetSavedSearch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SavedSearchResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    UpdateSavedSearch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Request"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SavedSearchResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    DeleteSavedSearch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetSavedSearchResults: {
        parameters: {
            query?: {
                page?: number;
                pageSize?: number;
                sort?: string;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SearchPageOfContractSummary"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListAlertDeliveries: {
        parameters: {
            query?: {
                page?: number;
                pageSize?: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedListOfAlertDeliveryResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    PauseSavedSearch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ResumeSavedSearch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    Unsubscribe: {
        parameters: {
            query?: {
                token?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/html": string;
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/html": string;
                };
            };
        };
    };
}
