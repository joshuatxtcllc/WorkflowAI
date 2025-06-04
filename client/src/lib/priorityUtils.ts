
import { PRIORITY_LEVELS } from './constants';
import type { OrderWithDetails } from '@shared/schema';

export const getPriorityConfig = (priority: string) => {
  return PRIORITY_LEVELS.find(p => p.value === priority) || PRIORITY_LEVELS[0];
};

export const getPriorityBadgeColor = (priority: string) => {
  const config = getPriorityConfig(priority);
  return config.bgColor;
};

export const getPriorityTextColor = (priority: string) => {
  const config = getPriorityConfig(priority);
  return config.textColor;
};

export const getPriorityBorderColor = (priority: string) => {
  const config = getPriorityConfig(priority);
  return config.borderColor;
};

export const getPriorityIcon = (priority: string) => {
  const config = getPriorityConfig(priority);
  return config.icon;
};

export const getUrgencyScore = (priority: string) => {
  const config = getPriorityConfig(priority);
  return config.urgencyScore;
};

export const sortByPriority = (orders: OrderWithDetails[], ascending = false) => {
  return orders.sort((a, b) => {
    const scoreA = getUrgencyScore(a.priority);
    const scoreB = getUrgencyScore(b.priority);
    return ascending ? scoreA - scoreB : scoreB - scoreA;
  });
};

export const filterByPriority = (orders: OrderWithDetails[], priorities: string[]) => {
  return orders.filter(order => priorities.includes(order.priority));
};

export const getHighPriorityOrders = (orders: OrderWithDetails[]) => {
  return orders.filter(order => ['HIGH', 'URGENT'].includes(order.priority));
};

export const getPriorityCount = (orders: OrderWithDetails[], priority: string) => {
  return orders.filter(order => order.priority === priority).length;
};

export const getPriorityDistribution = (orders: OrderWithDetails[]) => {
  return PRIORITY_LEVELS.map(level => ({
    ...level,
    count: getPriorityCount(orders, level.value)
  }));
};
