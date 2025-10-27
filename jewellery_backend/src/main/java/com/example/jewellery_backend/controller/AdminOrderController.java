package com.example.jewellery_backend.controller;

import com.example.jewellery_backend.dto.OrderResponseDto;
import com.example.jewellery_backend.dto.UpdateStatusDto;
import com.example.jewellery_backend.entity.Order;
import com.example.jewellery_backend.entity.OrderStatusType;
import com.example.jewellery_backend.service.OrderService;
import com.example.jewellery_backend.util.Mapper;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/orders")
@PreAuthorize("hasRole('ADMIN')")
public class AdminOrderController {

    private final OrderService orderService;

    public AdminOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public ResponseEntity<List<OrderResponseDto>> listOrders(
            @RequestParam(value = "status", required = false) String statusStr) {

        // Fetch all order DTOs from the service
        List<OrderResponseDto> dtos = orderService.listAllOrders();

        // If no status filter, return all
        if (statusStr == null || statusStr.isBlank()) {
            return ResponseEntity.ok(dtos);
        }

        // Parse enum in a case-insensitive way
        final OrderStatusType.OrderStatus statusEnum;
        try {
            statusEnum = OrderStatusType.OrderStatus.valueOf(statusStr.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            // Invalid status supplied -> 400 Bad Request
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        // Filter by status
        List<OrderResponseDto> filtered = dtos.stream()
                .filter(o -> o.getOrderStatusType() != null
                        && statusEnum.equals(o.getOrderStatusType().getOrderStatusName()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponseDto> getOrder(@PathVariable Long id) {
        Order order = orderService.getOrder(id);
        return ResponseEntity.ok(Mapper.toOrderResponseDto(order));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponseDto> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStatusDto dto) {

        Order updated = orderService.updateStatuses(
                id,
                dto.getOrderStatus(),
                dto.getPaymentStatus()
        );

        return ResponseEntity.ok(Mapper.toOrderResponseDto(updated));
    }
}