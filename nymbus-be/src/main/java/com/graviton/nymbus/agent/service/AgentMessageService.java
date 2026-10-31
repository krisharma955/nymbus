package com.graviton.nymbus.agent.service;

import com.graviton.nymbus.agent.entity.AgentExecution;
import com.graviton.nymbus.agent.entity.AgentMessage;
import com.graviton.nymbus.agent.entity.AgentMessageType;
import com.graviton.nymbus.agent.repository.AgentMessageRepository;
import com.graviton.nymbus.research.entity.ResearchTask;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgentMessageService {

    private final AgentMessageRepository agentMessageRepository;

    @Transactional
    public AgentMessage recordMessage(
            ResearchTask task,
            AgentExecution senderExecution,
            AgentExecution receiverExecution,
            AgentMessageType messageType,
            Map<String, Object> content) {

        AgentMessage msg = AgentMessage.builder()
                .researchTask(task)
                .senderExecution(senderExecution)
                .receiverExecution(receiverExecution)
                .messageType(messageType)
                .content(content)
                .build();

        msg = agentMessageRepository.save(msg);
        log.info("AgentMessage [{}] sent from exec {} to exec {}",
                messageType, senderExecution.getId(),
                receiverExecution != null ? receiverExecution.getId() : "broadcast");
        return msg;
    }
}
