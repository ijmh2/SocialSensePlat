import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Checkbox,
  IconButton,
  LinearProgress,
  Chip,
  alpha,
  useTheme,
  Collapse,
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  ExpandMore,
  ExpandLess,
  Flag,
  Assignment,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { analysisApi } from '../utils/api';

const MotionBox = motion(Box);

const ActionPlanCard = ({ analysisId, actionItems: initialItems, onUpdate }) => {
  const theme = useTheme();
  const [items, setItems] = useState(initialItems || []);
  const [expanded, setExpanded] = useState(true);
  const [saving, setSaving] = useState(false);

  const completedCount = items.filter(i => i.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  const toggleItem = async (itemId) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setItems(updatedItems);

    try {
      setSaving(true);
      await analysisApi.updateActionItems(analysisId, updatedItems);
      if (onUpdate) onUpdate(updatedItems);

      const item = updatedItems.find(i => i.id === itemId);
      if (item?.completed) {
        toast.success('Action completed!');
      }
    } catch (err) {
      console.error('Failed to update action items:', err);
      toast.error('Failed to save progress');
      // Revert on error
      setItems(items);
    } finally {
      setSaving(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return theme.palette.error.main;
      case 'medium': return theme.palette.warning.main;
      case 'low': return theme.palette.info.main;
      default: return theme.palette.grey[500];
    }
  };

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Card
      sx={{
        mb: 3,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
        borderRadius: '16px',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
            cursor: 'pointer',
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              }}
            >
              <Assignment sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Action Plan
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {completedCount} of {items.length} completed
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {progress === 100 && (
              <Chip
                icon={<CheckCircle sx={{ fontSize: 16 }} />}
                label="All Done!"
                color="success"
                size="small"
              />
            )}
            <IconButton size="small">
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: progress === 100
                  ? `linear-gradient(90deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`
                  : `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              },
            }}
          />
        </Box>

        {/* Action Items */}
        <Collapse in={expanded}>
          <AnimatePresence>
            {items.map((item, index) => (
              <MotionBox
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  p: 2,
                  mb: 1,
                  borderRadius: '12px',
                  background: item.completed
                    ? alpha(theme.palette.success.main, 0.05)
                    : theme.palette.background.paper,
                  border: `1px solid ${
                    item.completed
                      ? alpha(theme.palette.success.main, 0.2)
                      : alpha(theme.palette.divider, 0.5)
                  }`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: item.completed
                      ? alpha(theme.palette.success.main, 0.08)
                      : alpha(theme.palette.primary.main, 0.03),
                  },
                }}
              >
                <Checkbox
                  checked={item.completed}
                  onChange={() => toggleItem(item.id)}
                  disabled={saving}
                  icon={<RadioButtonUnchecked />}
                  checkedIcon={<CheckCircle />}
                  sx={{
                    p: 0,
                    color: alpha(theme.palette.primary.main, 0.5),
                    '&.Mui-checked': {
                      color: theme.palette.success.main,
                    },
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body1"
                    fontWeight={500}
                    sx={{
                      textDecoration: item.completed ? 'line-through' : 'none',
                      color: item.completed ? 'text.secondary' : 'text.primary',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {item.title}
                  </Typography>
                  {item.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.5,
                        opacity: item.completed ? 0.6 : 1,
                      }}
                    >
                      {item.description}
                    </Typography>
                  )}
                </Box>
                {item.priority && (
                  <Chip
                    icon={<Flag sx={{ fontSize: 14 }} />}
                    label={item.priority}
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '0.7rem',
                      textTransform: 'capitalize',
                      background: alpha(getPriorityColor(item.priority), 0.1),
                      color: getPriorityColor(item.priority),
                      borderColor: alpha(getPriorityColor(item.priority), 0.3),
                      '& .MuiChip-icon': {
                        color: 'inherit',
                      },
                    }}
                    variant="outlined"
                  />
                )}
              </MotionBox>
            ))}
          </AnimatePresence>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default ActionPlanCard;
