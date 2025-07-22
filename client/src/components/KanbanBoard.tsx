import React, { useState, useEffect, memo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../hooks/use-toast";
import { useIsMobile } from "../hooks/use-mobile";
import { useConfettiStore } from "../store/useConfettiStore";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { useOrderStore } from "../store/useOrderStore";
import { apiRequest } from "../lib/queryClient";
import { OrderWithDetails } from "@shared/schema";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import OrderCard from "./OrderCard";
import NewOrderModal from "./NewOrderModal";

const statusColumns = [
  { id: "QUOTED", title: "Quoted", color: "bg-blue-500" },
  { id: "APPROVED", title: "Approved", color: "bg-green-500" },
  { id: "IN_PRODUCTION", title: "In Production", color: "bg-yellow-500" },
  { id: "READY_FOR_PICKUP", title: "Ready", color: "bg-purple-500" },
  { id: "COMPLETED", title: "Completed", color: "bg-gray-500" },
];

export default memo(function KanbanBoard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { triggerConfetti, originX, originY, burst, reset } = useConfettiStore();
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { data: orders = [], isLoading, error, refetch } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await apiRequest("/api/orders", {
        method: 'GET'
      });
      return Array.isArray(response) ? response : [];
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true, // Enable initial fetch
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: true,
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<OrderWithDetails> }) => {
      return await apiRequest(`/api/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order Updated",
        description: "Order status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update order",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateOrderMutation.mutate({
      id: orderId,
      updates: { status: newStatus },
    });

    if (newStatus === "COMPLETED") {
      triggerConfetti();
    }
  };

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
  }, [orders]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">
          Failed to load orders. 
          <Button onClick={() => refetch()} className="ml-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Production Board</h2>
          <Button
            onClick={() => setShowNewOrderModal(true)}
            className="bg-jade-500 hover:bg-jade-400 text-black"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>

        <div className="relative">
          {!isMobile && canScrollLeft && (
            <Button
              variant="outline"
              size="sm"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-gray-800 border-gray-600"
              onClick={scrollLeft}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}

          {!isMobile && canScrollRight && (
            <Button
              variant="outline"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-gray-800 border-gray-600"
              onClick={scrollRight}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          <ScrollArea className="w-full">
            <div
              ref={scrollContainerRef}
              className="flex gap-4 pb-4 overflow-x-auto min-h-[500px]"
              onScroll={checkScrollButtons}
            >
              {statusColumns.map((column) => {
                const columnOrders = orders.filter(order => order.status === column.id);

                return (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    orders={columnOrders}
                    onStatusChange={handleStatusChange}
                  />
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {showNewOrderModal && (
          <NewOrderModal onClose={() => setShowNewOrderModal(false)} />
        )}
      </div>
    </DndProvider>
  );
});

function KanbanColumn({ column, orders, onStatusChange }: {
  column: { id: string; title: string; color: string };
  orders: OrderWithDetails[];
  onStatusChange: (orderId: string, newStatus: string) => void;
}) {
  const [{ isOver }, drop] = useDrop({
    accept: "ORDER_CARD",
    drop: (item: { id: string; status: string }) => {
      if (item.status !== column.id) {
        onStatusChange(item.id, column.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop}
      className={`flex-shrink-0 w-80 bg-gray-800 rounded-lg p-4 ${
        isOver ? "ring-2 ring-jade-500" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${column.color}`} />
        <h3 className="font-medium text-white">{column.title}</h3>
        <Badge variant="secondary" className="ml-auto">
          {orders.length}
        </Badge>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {orders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <OrderCard order={order} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}