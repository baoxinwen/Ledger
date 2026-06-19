import { Box, Card, CardContent, Skeleton, Grid } from '@mui/material';

export function DashboardSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width={200} height={40} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={300} height={20} sx={{ mb: 4 }} />

      <Grid container spacing={3} sx={{ mb: 5 }}>
        {[1, 2, 3].map((i) => (
          <Grid size={{ xs: 12, md: 4 }} key={i}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width={100} height={16} sx={{ mb: 1 }} />
                <Skeleton variant="text" width={150} height={40} sx={{ mb: 1 }} />
                <Skeleton variant="text" width={80} height={16} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width={120} height={16} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={8} sx={{ mb: 2, borderRadius: 4 }} />
              <Skeleton variant="rectangular" height={36} sx={{ mb: 1, borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width={150} height={16} sx={{ mb: 2 }} />
              {[1, 2, 3, 4, 5].map((i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Skeleton variant="rectangular" width={44} height={44} sx={{ borderRadius: 1 }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="text" width="40%" height={16} />
                  </Box>
                  <Skeleton variant="text" width={80} height={20} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export function TransactionListSkeleton() {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Skeleton variant="text" width={200} height={40} sx={{ mb: 0.5 }} />
          <Skeleton variant="text" width={100} height={20} />
        </Box>
        <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width={60} height={16} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={40} sx={{ mb: 2, borderRadius: 1 }} />
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1.5, borderRadius: 1 }} />
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 9 }}>
          <Card>
            <CardContent>
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Skeleton variant="text" width={80} height={20} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Skeleton variant="rectangular" width={32} height={32} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="text" width={60} height={20} />
                  </Box>
                  <Skeleton variant="text" width={120} height={20} sx={{ flex: 1 }} />
                  <Skeleton variant="text" width={80} height={20} />
                  <Skeleton variant="text" width={60} height={20} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export function ChartSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width={200} height={40} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={300} height={20} sx={{ mb: 3 }} />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width={120} height={16} sx={{ mb: 2 }} />
              <Skeleton variant="circular" width={250} height={250} sx={{ mx: 'auto' }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width={100} height={16} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width={150} height={16} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export function BudgetSkeleton() {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Skeleton variant="text" width={150} height={40} />
        <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
      </Box>

      <Grid container spacing={3}>
        {[1, 2, 3].map((i) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Skeleton variant="text" width={100} height={24} />
                    <Skeleton variant="text" width={60} height={16} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="circular" width={32} height={32} />
                  </Box>
                </Box>
                <Skeleton variant="rectangular" height={10} sx={{ mb: 1, borderRadius: 5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton variant="text" width={80} height={16} />
                  <Skeleton variant="text" width={40} height={16} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export function SettingsSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width={100} height={40} sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Skeleton variant="text" width={120} height={32} />
        <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
      </Box>
      <Grid container spacing={2}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Skeleton variant="rectangular" width={32} height={32} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="text" width={60} height={20} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Skeleton variant="circular" width={28} height={28} />
                    <Skeleton variant="circular" width={28} height={28} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
