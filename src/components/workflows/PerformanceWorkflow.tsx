import { Target, TrendingUp, Star, Award, Calendar, Users, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  dueDate: string;
  status: 'on-track' | 'at-risk' | 'completed' | 'overdue';
  category: 'individual' | 'team' | 'company';
}

interface Review {
  cycle: string;
  rating: number;
  status: 'completed' | 'pending' | 'in-progress';
  feedback?: string;
  date?: string;
}

const mockGoals: Goal[] = [
  {
    id: 'G1',
    title: 'Complete AI/ML Certification',
    description: 'Achieve AWS Machine Learning Specialty certification',
    progress: 75,
    dueDate: '2026-03-31',
    status: 'on-track',
    category: 'individual',
  },
  {
    id: 'G2',
    title: 'Lead Product Launch',
    description: 'Successfully deliver Q1 product release',
    progress: 45,
    dueDate: '2026-02-28',
    status: 'at-risk',
    category: 'team',
  },
  {
    id: 'G3',
    title: 'Improve Code Quality',
    description: 'Reduce bug density by 30%',
    progress: 100,
    dueDate: '2025-12-31',
    status: 'completed',
    category: 'individual',
  },
  {
    id: 'G4',
    title: 'Customer Satisfaction',
    description: 'Achieve NPS score of 50+',
    progress: 60,
    dueDate: '2026-03-31',
    status: 'on-track',
    category: 'company',
  },
];

const mockReviews: Review[] = [
  { cycle: 'Annual Review 2025', rating: 4.2, status: 'completed', feedback: 'Excellent performance across all key metrics. Strong leadership qualities demonstrated.', date: '2025-04-15' },
  { cycle: 'Mid-Year Review 2025', rating: 4.0, status: 'completed', feedback: 'Good progress on goals. Focus more on cross-team collaboration.', date: '2025-10-20' },
  { cycle: 'Annual Review 2026', rating: 0, status: 'pending', date: '2026-04-15' },
];

const skills = [
  { name: 'Technical Skills', score: 4.5, maxScore: 5 },
  { name: 'Communication', score: 4.2, maxScore: 5 },
  { name: 'Leadership', score: 4.0, maxScore: 5 },
  { name: 'Problem Solving', score: 4.7, maxScore: 5 },
  { name: 'Teamwork', score: 4.3, maxScore: 5 },
];

export function PerformanceWorkflow() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-success';
      case 'on-track': return 'text-primary';
      case 'at-risk': return 'text-warning';
      case 'overdue': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      'on-track': 'secondary',
      'at-risk': 'secondary',
      overdue: 'destructive',
    };
    return variants[status] || 'outline';
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "w-4 h-4",
          i < Math.floor(rating) ? "text-warning fill-warning" :
          i < rating ? "text-warning fill-warning/50" :
          "text-muted-foreground"
        )}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Overall Rating</span>
              <Star className="w-4 h-4 text-warning" />
            </div>
            <div className="text-2xl font-bold">4.2/5</div>
            <div className="flex gap-0.5 mt-1">{renderStars(4.2)}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Goals Progress</span>
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">70%</div>
            <div className="text-xs text-muted-foreground mt-1">3 of 4 on track</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Skills Score</span>
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <div className="text-2xl font-bold">4.34</div>
            <div className="text-xs text-success mt-1">+0.2 from last review</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Next Review</span>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">Apr '26</div>
            <div className="text-xs text-muted-foreground mt-1">Annual Review</div>
          </CardContent>
        </Card>
      </div>

      {/* Goals & Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              Performance Goals
            </CardTitle>
            <Button size="sm" variant="outline">+ Add Goal</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockGoals.map((goal) => (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{goal.title}</span>
                      <Badge variant={getStatusBadge(goal.status)} className={cn("capitalize text-xs", getStatusColor(goal.status))}>
                        {goal.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium">{goal.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        goal.status === 'completed' ? "bg-success" :
                        goal.status === 'at-risk' ? "bg-warning" :
                        "bg-primary"
                      )}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{goal.category}</span>
                    <span>Due: {goal.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5" />
              Skills Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {skills.map((skill) => (
                <div key={skill.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{skill.name}</span>
                    <span className="text-sm">{skill.score}/{skill.maxScore}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-primary rounded-full transition-all"
                      style={{ width: `${(skill.score / skill.maxScore) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review History */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Review History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockReviews.map((review, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start justify-between p-4 rounded-lg",
                  "bg-muted/50 hover:bg-muted/70 transition-colors"
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium">{review.cycle}</span>
                    <Badge variant={
                      review.status === 'completed' ? 'default' :
                      review.status === 'in-progress' ? 'secondary' :
                      'outline'
                    } className="capitalize text-xs">
                      {review.status}
                    </Badge>
                  </div>
                  {review.status === 'completed' && (
                    <>
                      <div className="flex items-center gap-1 mb-2">
                        {renderStars(review.rating)}
                        <span className="text-sm ml-2">{review.rating}/5</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.feedback}</p>
                    </>
                  )}
                  {review.status === 'pending' && (
                    <p className="text-sm text-muted-foreground">Scheduled for {review.date}</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
