package services

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"crownco/core-api/config"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type StorageService struct {
	client     *minio.Client
	bucketName string
}

func NewStorageService(cfg *config.Config, bucketName ...string) (*StorageService, error) {
	bucket := cfg.B2BucketName
	if len(bucketName) > 0 && bucketName[0] != "" {
		bucket = bucketName[0]
	}

	if cfg.B2KeyID == "" || cfg.B2AppKey == "" {
		return &StorageService{bucketName: bucket}, nil
	}

	client, err := minio.New(cfg.B2Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.B2KeyID, cfg.B2AppKey, ""),
		Secure: true,
		Region: cfg.B2Region,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create B2 storage client: %w", err)
	}

	return &StorageService{
		client:     client,
		bucketName: bucket,
	}, nil
}

func (s *StorageService) GeneratePresignedUploadURL(ctx context.Context, objectKey string, expiry time.Duration) (string, error) {
	if s.client == nil {
		return "", fmt.Errorf("storage client not configured (B2_KEY_ID / B2_APP_KEY missing)")
	}

	presignedURL, err := s.client.PresignedPutObject(ctx, s.bucketName, objectKey, expiry)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned upload URL: %w", err)
	}

	return presignedURL.String(), nil
}

func (s *StorageService) GeneratePresignedDownloadURL(ctx context.Context, objectKey string, expiry time.Duration) (string, error) {
	if s.client == nil {
		return "", fmt.Errorf("storage client not configured (B2_KEY_ID / B2_APP_KEY missing)")
	}

	presignedURL, err := s.client.PresignedGetObject(ctx, s.bucketName, objectKey, expiry, url.Values{})
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned download URL: %w", err)
	}

	return presignedURL.String(), nil
}
