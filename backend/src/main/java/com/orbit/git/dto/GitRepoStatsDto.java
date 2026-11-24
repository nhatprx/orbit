package com.orbit.git.dto;

import java.util.List;

/** Traffic (14-day views/clones), repo metrics, and top contributor stats from GitHub. */
public record GitRepoStatsDto(
    int views14d,
    int uniqueVisitors14d,
    int clones14d,
    int uniqueCloners14d,
    int stars,
    int forks,
    int watchers,
    int openIssues,
    List<GitContributorDto> topContributors
) {
    public record GitContributorDto(
        String login,
        String avatarUrl,
        String htmlUrl,
        int contributions
    ) {}
}
