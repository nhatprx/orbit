package com.orbit.cloud.config;

import com.orbit.cloud.entity.CloudScopeType;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "orbit.cloud")
public class CloudProperties {

    private long userQuotaBytes = 5_368_709_120L;
    private long workspaceQuotaBytes = 53_687_091_200L;
    private long projectQuotaBytes = 10_737_418_240L;
    private long maxFileSizeBytes = 524_288_000L;
    private long maxOfficeFileSizeBytes = 26_214_400L;
    private long multipartThresholdBytes = 52_428_800L;
    private long multipartPartSizeBytes = 10_485_760L;
    private int trashRetentionDays = 30;
    private int uploadSessionTtlMinutes = 60;

    public long defaultQuotaFor(CloudScopeType scopeType) {
        return switch (scopeType) {
            case USER -> userQuotaBytes;
            case WORKSPACE -> workspaceQuotaBytes;
            case PROJECT -> projectQuotaBytes;
        };
    }

    public long getUserQuotaBytes() { return userQuotaBytes; }
    public void setUserQuotaBytes(long userQuotaBytes) { this.userQuotaBytes = userQuotaBytes; }

    public long getWorkspaceQuotaBytes() { return workspaceQuotaBytes; }
    public void setWorkspaceQuotaBytes(long workspaceQuotaBytes) { this.workspaceQuotaBytes = workspaceQuotaBytes; }

    public long getProjectQuotaBytes() { return projectQuotaBytes; }
    public void setProjectQuotaBytes(long projectQuotaBytes) { this.projectQuotaBytes = projectQuotaBytes; }

    public long getMaxFileSizeBytes() { return maxFileSizeBytes; }
    public void setMaxFileSizeBytes(long maxFileSizeBytes) { this.maxFileSizeBytes = maxFileSizeBytes; }

    public long getMaxOfficeFileSizeBytes() { return maxOfficeFileSizeBytes; }
    public void setMaxOfficeFileSizeBytes(long maxOfficeFileSizeBytes) { this.maxOfficeFileSizeBytes = maxOfficeFileSizeBytes; }

    public long getMultipartThresholdBytes() { return multipartThresholdBytes; }
    public void setMultipartThresholdBytes(long multipartThresholdBytes) { this.multipartThresholdBytes = multipartThresholdBytes; }

    public long getMultipartPartSizeBytes() { return multipartPartSizeBytes; }
    public void setMultipartPartSizeBytes(long multipartPartSizeBytes) { this.multipartPartSizeBytes = multipartPartSizeBytes; }

    public int getTrashRetentionDays() { return trashRetentionDays; }
    public void setTrashRetentionDays(int trashRetentionDays) { this.trashRetentionDays = trashRetentionDays; }

    public int getUploadSessionTtlMinutes() { return uploadSessionTtlMinutes; }
    public void setUploadSessionTtlMinutes(int uploadSessionTtlMinutes) { this.uploadSessionTtlMinutes = uploadSessionTtlMinutes; }
}
