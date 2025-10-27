package com.example.jewellery_backend.repository;

import com.example.jewellery_backend.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.jewellery_backend.entity.Order;
import com.example.jewellery_backend.entity.OrderStatusType;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.lang.NonNull;
import java.util.List;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<OrderItem> findByOrderId(Long orderId);
    List<Order> findAllByOrderId(Long orderId);


    List<Order> findByOrderStatus(OrderStatusType status);
    // Optional: use Pageable if you want paging:
    // Page<Order> findByStatus(OrderStatus status, Pageable pageable);
}
