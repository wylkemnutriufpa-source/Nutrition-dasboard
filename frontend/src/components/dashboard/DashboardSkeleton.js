import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Skeleton de carregamento premium para o Dashboard
 * Mostra a estrutura do layout enquanto dados carregam
 */

const SkeletonBlock = ({ className = '' }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);

const SkeletonCard = () => (
  <Card className="border-gray-100">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <SkeletonBlock className="h-3 w-24 mb-3" />
          <SkeletonBlock className="h-8 w-16 mb-2" />
          <SkeletonBlock className="h-2.5 w-20" />
        </div>
        <SkeletonBlock className="h-12 w-12 rounded-lg" />
      </div>
    </CardContent>
  </Card>
);

const SkeletonAlert = () => (
  <div className="p-4 rounded-lg border-2 border-gray-100 bg-white">
    <div className="flex items-start gap-3">
      <SkeletonBlock className="h-10 w-10 rounded-lg flex-shrink-0" />
      <div className="flex-1">
        <SkeletonBlock className="h-4 w-48 mb-2" />
        <SkeletonBlock className="h-3 w-72 mb-3" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-8 w-28 rounded-md" />
          <SkeletonBlock className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  </div>
);

const SkeletonRankItem = () => (
  <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-100">
    <SkeletonBlock className="h-8 w-8 rounded-full" />
    <div className="flex-1">
      <SkeletonBlock className="h-4 w-32 mb-1" />
      <SkeletonBlock className="h-3 w-48" />
    </div>
    <SkeletonBlock className="h-8 w-12" />
    <SkeletonBlock className="h-6 w-16 rounded-full" />
  </div>
);

const DashboardSkeleton = () => (
  <div className="max-w-7xl mx-auto space-y-6 pb-8">
    {/* Header Skeleton */}
    <div className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl p-6 md:p-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBlock className="h-3 w-20 mb-2 !bg-gray-300" />
          <SkeletonBlock className="h-8 w-48 mb-3 !bg-gray-300" />
          <SkeletonBlock className="h-4 w-64 !bg-gray-300" />
        </div>
        <SkeletonBlock className="h-10 w-28 rounded-lg !bg-gray-300" />
      </div>
    </div>

    {/* Cards Skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
      {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
    </div>

    {/* Alertas Skeleton */}
    <Card className="border-gray-100">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-5 w-5 rounded" />
          <SkeletonBlock className="h-5 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <SkeletonAlert />
        <SkeletonAlert />
      </CardContent>
    </Card>

    {/* Ranking Skeleton */}
    <Card className="border-gray-100">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-5 w-5 rounded" />
          <SkeletonBlock className="h-5 w-36" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {[1, 2, 3].map(i => <SkeletonRankItem key={i} />)}
      </CardContent>
    </Card>

    {/* Gráfico + Recomendações Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-gray-100">
        <CardContent className="p-6">
          <SkeletonBlock className="h-5 w-48 mb-4" />
          <SkeletonBlock className="h-32 w-full rounded-lg" />
          <SkeletonBlock className="h-4 w-24 mx-auto mt-4" />
        </CardContent>
      </Card>
      <Card className="border-gray-100">
        <CardContent className="p-6">
          <SkeletonBlock className="h-5 w-56 mb-4" />
          <div className="space-y-3">
            <SkeletonBlock className="h-16 w-full rounded-lg" />
            <SkeletonBlock className="h-16 w-full rounded-lg" />
            <SkeletonBlock className="h-16 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default DashboardSkeleton;
