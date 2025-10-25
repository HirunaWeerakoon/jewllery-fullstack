package com.example.jewellery_backend.config;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity; // Import this
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy; // For stateless (if using JWT later) or stateful
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import com.example.jewellery_backend.entity.AdminUser; // Import Role enum

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http

                .cors(Customizer.withDefaults())
                // Disable CSRF for stateless APIs or simplified development
                .csrf(csrf -> csrf.disable())
                // Define authorization rules
                .authorizeHttpRequests(auth -> auth
                        // Allow specific public endpoints explicitly
                        .requestMatchers(HttpMethod.GET, "/api/public/**", "/api/products/**", "/api/categories/**", "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/orders", "/api/products/{productId}/reviews", "/api/cart/**", "/api/admin-users/register", "/api/admin-users/login", "/api/upload").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/cart/**").permitAll()
                        .requestMatchers(HttpMethod.DELETE, "/api/cart/**").permitAll()
                        // Secure admin endpoints
                        .requestMatchers("/api/admin/**", "/admin/**").hasRole(AdminUser.Role.admin.name().toUpperCase()) // Require ADMIN role for all /admin routes
                        // Secure specific non-admin endpoints
                        // .requestMatchers("/api/some-other-endpoint").authenticated()
                        // Deny anything else by default
                        .anyRequest().permitAll()
                )
                // Configure HTTP Basic Authentication for simplicity (replace with JWT later if needed)
                .httpBasic(Customizer.withDefaults())
                // Configure session management (can be STATELESS for JWT)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATEFUL)); // Use STATEFUL for session-based cart + httpBasic

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}