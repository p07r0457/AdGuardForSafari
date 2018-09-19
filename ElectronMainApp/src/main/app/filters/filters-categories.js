const subscriptions = require('./subscriptions');
const tagService = require('./filters-tags');
const config = require('config');
const collections = require('../utils/collections');

/**
 * Filter categories service
 */
module.exports = (() => {

    'use strict';

    /**
     * Custom filters group identifier
     *
     * @type {number}
     */
    const CUSTOM_FILTERS_GROUP_ID = 0;

    /**
     * @returns {Array.<*>} filters
     */
    const getFilters = () => {
        const result = subscriptions.getFilters().filter(f => !f.removed && f.filterId !== config.get('AntiBannerFiltersId').SEARCH_AND_SELF_PROMO_FILTER_ID);

        const tags = tagService.getTags();

        result.forEach(f => {
            f.tagsDetails = [];
            f.tags.forEach(tagId => {
                const tagDetails = tags.find(tag => tag.tagId === tagId);

                if (tagDetails) {
                    if (tagDetails.keyword.startsWith('reference:')) {
                        // Hide 'reference:' tags
                        return;
                    }

                    if (!tagDetails.keyword.startsWith('lang:')) {
                        // Hide prefixes except of 'lang:'
                        tagDetails.keyword = tagDetails.keyword.substring(tagDetails.keyword.indexOf(':') + 1);
                    }

                    f.tagsDetails.push(tagDetails);
                }
            });
        });

        return result;
    };

    /**
     * Selects filters by groupId, separates recommended
     *
     * @param groupId
     * @param filters
     * @returns {{recommendedFilters, otherFilters: *}}
     */
    const selectFiltersByGroupId = (groupId, filters) => {
        const groupFilters = filters.filter(f => f.groupId === groupId);

        if (groupId === CUSTOM_FILTERS_GROUP_ID) {
            return {
                recommendedFilters: groupFilters,
                otherFilters: []
            };
        }

        const recommendedFilters = tagService.getRecommendedFilters(groupFilters);
        const otherFilters = collections.getArraySubtraction(groupFilters, recommendedFilters);

        return {
            recommendedFilters: recommendedFilters,
            otherFilters: otherFilters
        };
    };

    /**
     * Constructs filters metadata for options.html page
     *
     * @returns {{filters: Array.<*>, categories: Array}}
     */
    const getFiltersMetadata = () => {
        const groupsMeta = subscriptions.getGroups();
        const filters = getFilters();

        const categories = [];

        for (let i = 0; i < groupsMeta.length; i++) {
            const category = groupsMeta[i];
            category.filters = selectFiltersByGroupId(category.groupId, filters);
            categories.push(category);
        }

        categories.push({
            groupId: CUSTOM_FILTERS_GROUP_ID,
            groupName: 'Custom',
            displayNumber: 99,
            filters: selectFiltersByGroupId(CUSTOM_FILTERS_GROUP_ID, filters)
        });

        return {
            filters: getFilters(),
            categories: categories
        };
    };

    /**
     * @param groupId
     * @returns {Array} recommended filters by groupId
     */
    const getRecommendedFilterIdsByGroupId = groupId => {
        const metadata = getFiltersMetadata();

        for (let i = 0; i < metadata.categories.length; i++) {
            const category = metadata.categories[i];
            if (category.groupId === groupId) {
                const result = [];
                category.filters.recommendedFilters.forEach(f => {
                    result.push(f.filterId);
                });

                return result;
            }
        }

        return [];
    };

    return {
        getFiltersMetadata: getFiltersMetadata,
        getRecommendedFilterIdsByGroupId: getRecommendedFilterIdsByGroupId
    };
})();
