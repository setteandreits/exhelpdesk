package com.exprivia.exhelpdesk.service;

import com.exprivia.exhelpdesk.dto.OverviewStatsDto;
import com.exprivia.exhelpdesk.dto.StatsMyDto;
import com.exprivia.exhelpdesk.model.Ticket;
import com.exprivia.exhelpdesk.model.User;
import com.exprivia.exhelpdesk.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final TicketRepository ticketRepository;
    private final UserService userService;

    public OverviewStatsDto getOverview() {
        List<Ticket> tickets = ticketRepository.findAll();
        OverviewStatsDto dto = new OverviewStatsDto();
        dto.setByStatus(groupCount(tickets, ticket -> ticket.getStato().name()));
        dto.setByCategory(groupCount(tickets, ticket -> ticket.getCategoria().name()));
        dto.setByPriority(groupCount(tickets, ticket -> ticket.getPriorita().name()));
        dto.setTopOpenCategories(topOpenCategories(tickets));
        dto.setLast30Days(lastThirtyDays(tickets));
        dto.setAvgResolutionHoursByCategory(avgResolutionHoursByCategory(tickets));
        return dto;
    }

    public StatsMyDto getMyStats(String email) {
        User user = userService.getByEmail(email);
        List<Ticket> myTickets = ticketRepository.findByRichiedente(user);
        StatsMyDto dto = new StatsMyDto();
        dto.setByStatus(groupCount(myTickets, ticket -> ticket.getStato().name()));
        dto.setTotal(myTickets.size());
        return dto;
    }

    private Map<String, Long> groupCount(List<Ticket> tickets, Function<Ticket, String> classifier) {
        return tickets.stream().collect(Collectors.groupingBy(classifier, LinkedHashMap::new, Collectors.counting()));
    }

    private Map<String, Long> topOpenCategories(List<Ticket> tickets) {
        return tickets.stream()
                .filter(ticket -> ticket.getStato() != Ticket.Stato.CHIUSO && ticket.getStato() != Ticket.Stato.RISOLTO)
                .collect(Collectors.groupingBy(ticket -> ticket.getCategoria().name(), Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
    }

    private Map<String, Long> lastThirtyDays(List<Ticket> tickets) {
        LocalDate from = LocalDate.now().minusDays(29);
        Map<String, Long> grouped = tickets.stream()
                .filter(ticket -> ticket.getDataApertura() != null)
                .filter(ticket -> !ticket.getDataApertura().toLocalDate().isBefore(from))
                .collect(Collectors.groupingBy(ticket -> ticket.getDataApertura().toLocalDate().toString(), Collectors.counting()));

        Map<String, Long> ordered = new LinkedHashMap<>();
        for (int i = 0; i < 30; i++) {
            LocalDate day = from.plusDays(i);
            ordered.put(day.toString(), grouped.getOrDefault(day.toString(), 0L));
        }
        return ordered;
    }

    private Map<String, Double> avgResolutionHoursByCategory(List<Ticket> tickets) {
        return tickets.stream()
                .filter(ticket -> ticket.getDataApertura() != null && ticket.getDataChiusura() != null)
                .collect(Collectors.groupingBy(ticket -> ticket.getCategoria().name()))
                .entrySet().stream()
                .sorted(Comparator.comparing(Map.Entry::getKey))
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> entry.getValue().stream()
                                .mapToDouble(ticket -> Duration.between(ticket.getDataApertura(), ticket.getDataChiusura()).toMinutes() / 60.0)
                                .average()
                                .orElse(0.0),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
    }
}
